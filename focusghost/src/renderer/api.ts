// Thin wrapper around window.api with helpers + a browser-only mock so the
// renderer can be developed/previewed in a plain Vite dev server without Electron.
import type { FocusGhostAPI } from '../shared/ipc';
import {
  AppCategory,
  DriftRisk,
  SessionState,
  type AppSettings,
  type ChatMessage,
  type SessionConfig,
  type SessionRecord,
  type SessionStatsSnapshot,
} from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/presets';

export function applyAccentClass(accent: AppSettings['accent']): void {
  const body = document.body;
  body.classList.remove('theme-teal', 'theme-violet', 'theme-amber');
  body.classList.add(`theme-${accent}`);
}

/** When loaded outside Electron, install a fully-functional in-memory mock API. */
export function ensureBrowserMockApi(): void {
  if (typeof window !== 'undefined' && window.api) return;
  const listeners = new Map<string, Set<(p: unknown) => void>>();
  const on = (ch: string, cb: (p: unknown) => void) => {
    if (!listeners.has(ch)) listeners.set(ch, new Set());
    listeners.get(ch)!.add(cb);
    return () => listeners.get(ch)!.delete(cb);
  };
  const emit = (ch: string, p: unknown) => listeners.get(ch)?.forEach((cb) => cb(p));

  let settings: AppSettings = { ...DEFAULT_SETTINGS };
  let cfg: SessionConfig | null = null;
  let started = 0;
  let snap: SessionStatsSnapshot = blankSnap();
  let nudgeCount = 0;
  let interval: number | null = null;
  const sessions: SessionRecord[] = [];
  const chat: ChatMessage[] = [];
  const categoryOverrides: Record<string, AppCategory> = {};

  function blankSnap(): SessionStatsSnapshot {
    return {
      state: SessionState.IDLE,
      taskName: '',
      startedAt: 0,
      durationMin: 0,
      elapsedMs: 0,
      remainingMs: 0,
      focusMs: 0,
      driftMs: 0,
      inactiveMs: 0,
      switchCount: 0,
      nudgeCount: 0,
      currentApp: null,
      currentAppCategory: AppCategory.UNKNOWN,
      driftRisk: DriftRisk.LOW,
      appTimeMap: {},
    };
  }

  const api: FocusGhostAPI = {
    sessionStart: async (c) => {
      cfg = { ...c, startedAt: Date.now() };
      started = cfg.startedAt;
      nudgeCount = 0;
      snap = {
        ...blankSnap(),
        state: SessionState.ACTIVE,
        taskName: c.taskName,
        startedAt: started,
        durationMin: c.durationMin,
        currentApp: 'Code',
        currentAppCategory: AppCategory.FOCUS,
        appTimeMap: { Code: { totalMs: 0, switches: 1, category: AppCategory.FOCUS, lastSeenAt: started } },
      };
      emit('session:state', SessionState.ACTIVE);
      if (interval) window.clearInterval(interval);
      interval = window.setInterval(() => {
        if (!cfg) return;
        const elapsed = Date.now() - started;
        snap = {
          ...snap,
          elapsedMs: elapsed,
          remainingMs: Math.max(0, cfg.durationMin * 60_000 - elapsed),
          focusMs: snap.focusMs + 1000,
          nudgeCount,
          appTimeMap: {
            ...snap.appTimeMap,
            [snap.currentApp ?? 'Code']: {
              ...(snap.appTimeMap[snap.currentApp ?? 'Code'] ?? {
                totalMs: 0,
                switches: 1,
                category: AppCategory.FOCUS,
                lastSeenAt: Date.now(),
              }),
              totalMs:
                (snap.appTimeMap[snap.currentApp ?? 'Code']?.totalMs ?? 0) + 1000,
            },
          },
        };
        emit('stats:update', snap);
        if (elapsed >= cfg.durationMin * 60_000) void api.sessionEnd();
      }, 1000);
      return snap;
    },
    sessionEnd: async () => {
      if (interval) window.clearInterval(interval);
      const rec: SessionRecord = {
        id: `s_${started}`,
        taskName: snap.taskName,
        startedAt: started,
        endedAt: Date.now(),
        durationMin: snap.durationMin,
        focusMs: snap.focusMs,
        driftMs: snap.driftMs,
        inactiveMs: snap.inactiveMs,
        switchCount: snap.switchCount,
        nudgeCount: snap.nudgeCount,
        appTimeMap: snap.appTimeMap,
        ghostInsight:
          'Solid run — most of the time landed on the task, with a couple of healthy detours.',
        chatLog: [...chat],
      };
      sessions.unshift(rec);
      cfg = null;
      snap = { ...snap, state: SessionState.RECAP };
      emit('session:state', SessionState.RECAP);
      emit('session:recap', rec);
      return rec;
    },
    sessionReset: async () => {
      snap = blankSnap();
      cfg = null;
      emit('session:state', SessionState.IDLE);
    },
    getSettings: async () => settings,
    updateSettings: async (patch) => {
      settings = { ...settings, ...patch };
      emit('settings:changed', settings);
      return settings;
    },
    listHistory: async () => sessions,
    clearHistory: async () => {
      sessions.length = 0;
    },
    getStreak: async () => {
      // basic browser-mock streak
      const today = new Date();
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const days = sessions
        .filter((s) => s.focusMs >= 10 * 60_000)
        .map((s) => fmt(new Date(s.startedAt)));
      const unique = Array.from(new Set(days));
      return {
        current: unique.includes(fmt(today)) ? 1 : 0,
        longest: unique.length > 0 ? 1 : 0,
        todayHasSession: unique.includes(fmt(today)),
        recentDays: unique,
        totalSessions: sessions.length,
        totalFocusMs: sessions.reduce((a, s) => a + s.focusMs, 0),
      };
    },
    getCategories: async () => categoryOverrides,
    setCategory: async (app, category) => {
      categoryOverrides[app] = category;
      return { ...categoryOverrides };
    },
    listKnownApps: async () => {
      const map = new Map<string, { totalMs: number; appearances: number }>();
      for (const s of sessions) {
        for (const [app, e] of Object.entries(s.appTimeMap)) {
          const cur = map.get(app) ?? { totalMs: 0, appearances: 0 };
          cur.totalMs += e.totalMs;
          cur.appearances += 1;
          map.set(app, cur);
        }
      }
      // seed with a few common apps so the editor isn't empty in browser preview
      const seeds: Record<string, AppCategory> = {
        Code: AppCategory.FOCUS,
        Chrome: AppCategory.RESEARCH,
        Terminal: AppCategory.FOCUS,
        Notion: AppCategory.FOCUS,
        Twitter: AppCategory.DISTRACTION,
        YouTube: AppCategory.DISTRACTION,
        Slack: AppCategory.DISTRACTION,
        Figma: AppCategory.FOCUS,
      };
      for (const k of Object.keys(seeds)) {
        if (!map.has(k)) map.set(k, { totalMs: 0, appearances: 0 });
      }
      return Array.from(map.entries())
        .map(([app, agg]) => ({
          app,
          totalMs: agg.totalMs,
          appearances: agg.appearances,
          defaultCategory: seeds[app] ?? AppCategory.UNKNOWN,
          override: categoryOverrides[app],
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
    },
    sendChat: async (text) => {
      chat.push({ id: `u_${Date.now()}`, variant: 'user', text, timestamp: Date.now() });
      const msg: ChatMessage = {
        id: `g_${Date.now()}`,
        variant: 'ghost',
        text: 'Heard. (browser preview — connect Gemini in Electron build for real replies.)',
        timestamp: Date.now(),
      };
      chat.push(msg);
      emit('chat:reply', msg);
      return msg;
    },
    submitStuck: async (description) => {
      const msg: ChatMessage = {
        id: `sr_${Date.now()}`,
        variant: 'stuck-response',
        text: `REFRAME: What's the smallest piece of "${description}" you actually understand?\nNEXT STEPS:\n1. Write the function signature you wish existed\n2. Print the input and desired output side by side\n3. Solve it for one example by hand`,
        timestamp: Date.now(),
      };
      emit('stuck:response', msg);
      return msg;
    },
    setOpacity: async () => {},
    setAlwaysOnTop: async () => {},
    toggleCollapsed: async () => {
      const next = !document.body.classList.contains('collapsed');
      document.body.classList.toggle('collapsed', next);
      emit('window:collapsedState', next);
      return next;
    },
    devSimulateSwitch: async (app) => {
      snap = {
        ...snap,
        currentApp: app,
        switchCount: snap.switchCount + 1,
        currentAppCategory:
          /twitter|youtube|reddit|tiktok|discord/i.test(app) ? AppCategory.DISTRACTION : AppCategory.FOCUS,
      };
      emit('window:switch', { app, title: '', timestamp: Date.now() });
      emit('stats:update', snap);
      // simulate nudge after 5 sim switches
      if (snap.switchCount % 5 === 0) {
        nudgeCount += 1;
        emit('nudge:trigger', {
          id: `n_${Date.now()}`,
          text: `A few tab-hops noticed — back to "${snap.taskName}"?`,
          reason: 'switch-drift',
          ctas: { accept: 'On it', dismiss: 'Not now' },
        });
      }
    },
    onSessionState: (cb) => on('session:state', cb as any),
    onSessionInactive: (cb) => on('session:inactive', cb as any),
    onSessionRecap: (cb) => on('session:recap', cb as any),
    onWindowSwitch: (cb) => on('window:switch', cb as any),
    onStatsUpdate: (cb) => on('stats:update', cb as any),
    onDriftScore: (cb) => on('drift:score', cb as any),
    onNudge: (cb) => on('nudge:trigger', cb as any),
    onPatternNotice: (cb) => on('pattern:notice', cb as any),
    onStuckActivate: (cb) => on('stuck:activate', cb as any),
    onStuckResponse: (cb) => on('stuck:response', cb as any),
    onChatReply: (cb) => on('chat:reply', cb as any),
    onSettingsChanged: (cb) => on('settings:changed', cb as any),
    onCollapsedState: (cb) => on('window:collapsedState', cb as any),
  };

  (window as any).api = api;
}
