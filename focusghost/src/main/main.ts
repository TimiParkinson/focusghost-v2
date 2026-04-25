// Electron main entry. Wires all modules: tracker, FSM, stats, nudge, stuck, gemini, IPC.
// Window architecture (anchor/panel/nudge) is delegated to WindowController.
import { app, ipcMain } from 'electron';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { IPC, type WindowMode } from '../shared/ipc';
import { SessionMachine } from './sessionMachine';
import { StatsTracker } from './statsTracker';
import { WindowTracker } from './windowTracker';
import { InactivityTimer } from './inactivityTimer';
import { NudgeEngine } from './nudgeEngine';
import { StuckDetector } from './stuckDetector';
import { scoreDrift } from './driftScorer';
import { categorizeApp } from './appCategories';
import {
  clearSessions,
  getCategoryOverrides,
  getSettings,
  loadSessions,
  saveSession,
  setCategoryOverride,
  updateSettings,
} from './persistence';
import { aggregateKnownApps, computeStreak } from './streaks';
import { promptGemini } from './gemini';
import {
  checkInNudge,
  ghostInsightPrompt,
  inactivityNudge,
  patternNoticePrompt,
  stuckPrompt,
  switchDriftNudge,
  systemPrompt,
} from './prompts';
import {
  AppCategory,
  DriftRisk,
  SessionState,
  type ChatMessage,
  type NudgePayload,
  type SessionConfig,
  type SessionRecord,
  type SessionStatsSnapshot,
} from '../shared/types';
import { createDemoMode } from './demoMode';
import { WindowController } from './windowController';

// Load .env from app root (for local dev). In packaged app users can set env at OS level.
loadDotenv({ path: path.join(process.cwd(), '.env') });

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

let controller: WindowController | null = null;
let collapsedBar = false;

// ---- shared session runtime ----
const machine = new SessionMachine();
const stats = new StatsTracker();
const tracker = new WindowTracker();
const inactivity = new InactivityTimer(getSettings().inactivityThresholdSec);
const nudges = new NudgeEngine();
const stuck = new StuckDetector();

let sessionConfig: SessionConfig | null = null;
let statsTimer: NodeJS.Timeout | null = null;
let driftTimer: NodeJS.Timeout | null = null;
let patternTimer: NodeJS.Timeout | null = null;
let switchesAtLastDriftScore = 0;
const chatHistory: ChatMessage[] = [];
let lastDriftRisk: DriftRisk = DriftRisk.LOW;
let demoCtl: { start: () => void; stop: () => void } | null = null;

// ---- helpers ----
function broadcast<T>(channel: string, payload: T): void {
  const wc = controller?.panelWebContents();
  wc?.send(channel, payload);
}

function buildSnapshot(): SessionStatsSnapshot {
  const snap = stats.snapshot();
  const elapsedMs = sessionConfig ? Date.now() - sessionConfig.startedAt : 0;
  const durationMin = sessionConfig?.durationMin ?? 0;
  const remainingMs = Math.max(0, durationMin * 60_000 - elapsedMs);
  const currentApp = snap.currentApp;
  const overrides = getCategoryOverrides();
  const currentCat = currentApp ? categorizeApp(currentApp, overrides) : AppCategory.UNKNOWN;
  return {
    state: machine.state,
    taskName: sessionConfig?.taskName ?? '',
    startedAt: sessionConfig?.startedAt ?? 0,
    durationMin,
    elapsedMs,
    remainingMs,
    focusMs: snap.focusMs,
    driftMs: snap.driftMs,
    inactiveMs: snap.inactiveMs,
    switchCount: snap.switchCount,
    nudgeCount: nudges.count(),
    currentApp,
    currentAppCategory: currentCat,
    driftRisk: lastDriftRisk,
    appTimeMap: snap.appTimeMap,
  };
}

function pushChat(msg: ChatMessage): void {
  chatHistory.push(msg);
  if (chatHistory.length > 200) chatHistory.shift();
}

// ---- session lifecycle ----
async function startSession(cfg: SessionConfig): Promise<SessionStatsSnapshot> {
  sessionConfig = { ...cfg, startedAt: cfg.startedAt || Date.now() };
  stats.reset();
  nudges.reset();
  stuck.reset();
  chatHistory.length = 0;
  switchesAtLastDriftScore = 0;
  lastDriftRisk = DriftRisk.LOW;
  machine.send({ type: 'START' });

  const settings = getSettings();
  inactivity.setThreshold(settings.inactivityThresholdSec);
  inactivity.start();
  await tracker.start();

  // tick stats every 1s, broadcast every 2s
  statsTimer = setInterval(() => {
    stats.tick();
    nudges.evaluate({
      switchCount: stats.snapshot().switchCount,
      driftMs: stats.snapshot().driftMs,
      inactiveMs: stats.snapshot().inactiveMs,
      focusMs: stats.snapshot().focusMs,
      elapsedMs: sessionConfig ? Date.now() - sessionConfig.startedAt : 0,
      settings: getSettings(),
    });
    broadcast(IPC.STATS_UPDATE, buildSnapshot());

    if (sessionConfig && Date.now() - sessionConfig.startedAt >= sessionConfig.durationMin * 60_000) {
      void endSession();
    }
  }, 1000);

  // recompute drift risk every 30s
  driftTimer = setInterval(() => {
    const snap = stats.snapshot();
    const switchesLastWindow = snap.switchCount - switchesAtLastDriftScore;
    switchesAtLastDriftScore = snap.switchCount;
    const elapsedMs = sessionConfig ? Date.now() - sessionConfig.startedAt : 0;
    const { score, raw } = scoreDrift({
      switchesLastWindow,
      appTimeMap: snap.appTimeMap,
      inactiveMs: snap.inactiveMs,
      elapsedMs,
      switchTriggerCount: getSettings().switchTriggerCount,
    });
    lastDriftRisk = score;
    if (score === DriftRisk.HIGH) machine.send({ type: 'DRIFT' });
    else if (score === DriftRisk.LOW) machine.send({ type: 'FOCUS' });
    broadcast(IPC.DRIFT_SCORE, { score, raw });
  }, 30_000);

  // pattern notice every 15 min if elapsed > 10 min
  patternTimer = setInterval(() => {
    void firePatternNotice();
  }, 15 * 60_000);

  if (getSettings().demoMode || process.argv.includes('--demo')) {
    if (!demoCtl) {
      demoCtl = createDemoMode({
        tracker,
        onNudge: () => fireNudge('switch-drift'),
        onStuck: () => stuck.emit('stuck', { recentApps: ['Code', 'Chrome'], switches: 8 }),
        onEnd: () => void endSession(),
      });
    }
    demoCtl.start();
  }

  broadcast(IPC.SESSION_STATE, machine.state);
  return buildSnapshot();
}

async function endSession(): Promise<SessionRecord> {
  if (!sessionConfig) {
    return {
      id: `s_${Date.now()}`,
      taskName: '',
      startedAt: 0,
      endedAt: Date.now(),
      durationMin: 0,
      focusMs: 0,
      driftMs: 0,
      inactiveMs: 0,
      switchCount: 0,
      nudgeCount: 0,
      appTimeMap: {},
      chatLog: [],
    };
  }
  stats.tick();
  if (statsTimer) clearInterval(statsTimer);
  if (driftTimer) clearInterval(driftTimer);
  if (patternTimer) clearInterval(patternTimer);
  inactivity.stop();
  tracker.stop();
  if (demoCtl) demoCtl.stop();

  machine.send({ type: 'END' });
  const snap = buildSnapshot();
  const insight = await promptGemini({
    systemInstruction: systemPrompt(getSettings().ghostPersonality, snap),
    user: ghostInsightPrompt(snap),
  });

  const record: SessionRecord = {
    id: `s_${sessionConfig.startedAt}`,
    taskName: sessionConfig.taskName,
    startedAt: sessionConfig.startedAt,
    endedAt: Date.now(),
    durationMin: sessionConfig.durationMin,
    focusMs: snap.focusMs,
    driftMs: snap.driftMs,
    inactiveMs: snap.inactiveMs,
    switchCount: snap.switchCount,
    nudgeCount: snap.nudgeCount,
    appTimeMap: snap.appTimeMap,
    ghostInsight: insight,
    chatLog: [...chatHistory],
  };
  saveSession(record);
  broadcast(IPC.SESSION_RECAP, record);
  broadcast(IPC.SESSION_STATE, machine.state);
  sessionConfig = null;
  return record;
}

async function fireNudge(reason: 'switch-drift' | 'inactivity' | 'check-in' | 'sprint-offer'): Promise<NudgePayload | null> {
  if (!sessionConfig) return null;
  const snap = buildSnapshot();
  const focusMin = Math.round(snap.focusMs / 60_000);
  let user: string;
  if (reason === 'switch-drift')
    user = switchDriftNudge({
      taskName: snap.taskName,
      switchCount: snap.switchCount,
      currentApp: snap.currentApp ?? 'something else',
      focusMin,
    });
  else if (reason === 'inactivity')
    user = inactivityNudge({ taskName: snap.taskName, sinceSec: Math.round(inactivity.msSinceActivity() / 1000) });
  else if (reason === 'check-in') user = checkInNudge({ taskName: snap.taskName, focusMin });
  else user = `Offer the user a 12-minute focus sprint to push through on "${snap.taskName}". One sentence.`;

  const text = await promptGemini({
    systemInstruction: systemPrompt(getSettings().ghostPersonality, snap),
    user,
  });

  const id = `n_${Date.now()}`;
  const payload: NudgePayload = {
    id,
    text,
    reason,
    ctas: { accept: 'On it', dismiss: 'Not now' },
  };
  // Panel renderer still gets the inline event for the chat log.
  broadcast(IPC.NUDGE_TRIGGER, payload);
  pushChat({ id, variant: 'nudge', text, timestamp: Date.now(), meta: { reason } });
  return payload;
}

async function firePatternNotice(): Promise<void> {
  if (!sessionConfig) return;
  const elapsed = Date.now() - sessionConfig.startedAt;
  if (elapsed < 10 * 60_000) return;
  const snap = buildSnapshot();
  const text = await promptGemini({
    systemInstruction: systemPrompt(getSettings().ghostPersonality, snap),
    user: patternNoticePrompt(snap),
  });
  const id = `p_${Date.now()}`;
  broadcast(IPC.PATTERN_NOTICE, { id, text });
  pushChat({ id, variant: 'pattern', text, timestamp: Date.now() });
}

// ---- module wiring ----
machine.on('change', (next: SessionState) => broadcast(IPC.SESSION_STATE, next));

tracker.on('switch', (info) => {
  inactivity.ping();
  stats.recordSwitch(info.app);
  stuck.recordSwitch(info.app);
  broadcast(IPC.WINDOW_SWITCH, info);
});

inactivity.on('inactive', (p) => {
  machine.send({ type: 'INACTIVE' });
  stats.recordInactive(p.sinceMs);
  broadcast(IPC.SESSION_INACTIVE, p);
  nudges.triggerInactivity();
});

inactivity.on('resume', () => machine.send({ type: 'FOCUS' }));

nudges.on('nudge', (n: { reason: any }) => {
  void fireNudge(n.reason).then((payload) => {
    if (payload) controller?.showNudge(payload);
  });
});

stuck.on('stuck', (p) => broadcast(IPC.STUCK_ACTIVATE, { id: `st_${Date.now()}`, ...p }));

// ---- IPC handlers ----
ipcMain.handle(IPC.SESSION_START, (_e, cfg: SessionConfig) => startSession(cfg));
ipcMain.handle(IPC.SESSION_END, () => endSession());
ipcMain.handle(IPC.SESSION_RESET, () => {
  machine.send({ type: 'RESET' });
  broadcast(IPC.SESSION_STATE, machine.state);
});
ipcMain.handle(IPC.SETTINGS_GET, () => getSettings());
ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, patch) => {
  const next = updateSettings(patch);
  inactivity.setThreshold(next.inactivityThresholdSec);
  if (typeof patch.opacity === 'number' || typeof patch.alwaysOnTop === 'boolean') {
    controller?.updateSettings(next);
  }
  broadcast(IPC.SETTINGS_CHANGED, next);
  return next;
});
ipcMain.handle(IPC.HISTORY_LIST, () => loadSessions());
ipcMain.handle(IPC.HISTORY_CLEAR, () => clearSessions());
ipcMain.handle(IPC.STREAK_GET, () => computeStreak(loadSessions()));
ipcMain.handle(IPC.CATEGORIES_GET, () => getCategoryOverrides());
ipcMain.handle(IPC.CATEGORIES_KNOWN_APPS, () => aggregateKnownApps(loadSessions()));
ipcMain.handle(IPC.CATEGORIES_SET, (_e, { app: appName, category }) => {
  setCategoryOverride(appName, category);
  return getCategoryOverrides();
});

ipcMain.handle(IPC.CHAT_SEND, async (_e, { text }: { text: string }) => {
  const userMsg: ChatMessage = { id: `u_${Date.now()}`, variant: 'user', text, timestamp: Date.now() };
  pushChat(userMsg);
  const snap = sessionConfig ? buildSnapshot() : null;
  const reply = await promptGemini({
    systemInstruction: systemPrompt(getSettings().ghostPersonality, snap),
    history: chatHistory
      .filter((m) => m.variant === 'user' || m.variant === 'ghost')
      .slice(-10)
      .map((m) => ({ role: m.variant === 'user' ? ('user' as const) : ('model' as const), text: m.text })),
    user: text,
  });
  const ghostMsg: ChatMessage = { id: `g_${Date.now()}`, variant: 'ghost', text: reply, timestamp: Date.now() };
  pushChat(ghostMsg);
  broadcast(IPC.CHAT_REPLY, ghostMsg);
  return ghostMsg;
});

ipcMain.handle(IPC.STUCK_SUBMIT, async (_e, { description }: { description: string }) => {
  pushChat({ id: `sp_${Date.now()}`, variant: 'stuck-prompt', text: description, timestamp: Date.now() });
  const snap = sessionConfig ? buildSnapshot() : null;
  const recent = snap ? Object.keys(snap.appTimeMap).slice(0, 4) : [];
  const text = await promptGemini({
    systemInstruction: systemPrompt(getSettings().ghostPersonality, snap),
    user: stuckPrompt({
      taskName: snap?.taskName ?? '',
      stuckDescription: description,
      currentApp: snap?.currentApp ?? '',
      recentApps: recent,
    }),
  });
  const reply: ChatMessage = {
    id: `sr_${Date.now()}`,
    variant: 'stuck-response',
    text,
    timestamp: Date.now(),
  };
  pushChat(reply);
  broadcast(IPC.STUCK_RESPONSE, reply);
  return reply;
});

ipcMain.handle(IPC.WINDOW_SET_OPACITY, (_e, value: number) => {
  const v = Math.max(0.3, Math.min(1, value));
  updateSettings({ opacity: v });
  controller?.updateSettings(getSettings());
});
ipcMain.handle(IPC.WINDOW_SET_ALWAYS_ON_TOP, (_e, v: boolean) => {
  updateSettings({ alwaysOnTop: v });
  controller?.updateSettings(getSettings());
});
ipcMain.handle(IPC.WINDOW_TOGGLE_COLLAPSED, () => {
  collapsedBar = !collapsedBar;
  controller?.setCollapsedBar(collapsedBar);
  broadcast(IPC.WINDOW_COLLAPSED_STATE, collapsedBar);
  return collapsedBar;
});

// ---- multi-surface window controller ----
ipcMain.handle(IPC.WINDOW_SET_MODE, (_e, mode: WindowMode) => controller?.setMode(mode));
ipcMain.handle(IPC.WINDOW_EXPAND, () => controller?.expand());
ipcMain.handle(IPC.WINDOW_COLLAPSE, () => controller?.collapse());
ipcMain.handle(IPC.WINDOW_PIN, (_e, pinned: boolean) => controller?.setPinned(pinned));
ipcMain.handle(IPC.ANCHOR_HOVER, (_e, hovering: boolean) => controller?.setAnchorHover(hovering));
ipcMain.handle(IPC.ANCHOR_CLICK, () => controller?.anchorClicked());
ipcMain.handle(IPC.NUDGE_DISMISS, () => controller?.dismissNudge());
ipcMain.handle(IPC.NUDGE_OPEN_PANEL, () => {
  controller?.dismissNudge();
  controller?.expand();
});

ipcMain.handle(IPC.DEV_SIMULATE_SWITCH, (_e, { app, title }: { app: string; title?: string }) => {
  tracker.injectSwitch(app, title ?? '');
});

// ---- window bootstrap via controller ----
function bootController(): void {
  const settings = getSettings();
  const rendererUrl =
    process.env.ELECTRON_RENDERER_URL ??
    (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : null);
  controller = new WindowController(
    {
      rendererUrl,
      rendererFile: path.join(__dirname, '../renderer/index.html'),
      preloadPath: path.join(__dirname, '../preload/preload.js'),
    },
    settings,
  );
  controller.init();
  controller.on('mode', (m) => broadcast(IPC.WINDOW_MODE_CHANGED, m));
}

// React to session FSM transitions in window-land.
machine.on('change', (next: SessionState) => controller?.reactToSession(next));

// When NudgeEngine emits a nudge in main, push it to the popup window.
nudges.on('nudge', (n: { reason: any }) => {
  void fireNudge(n.reason).then((payload) => {
    if (payload) controller?.showNudge(payload);
  });
});

app.whenReady().then(bootController);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!controller) bootController();
});
