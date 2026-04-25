// IPC channel constants and payload contract between main and renderer.
// Living document — every channel is listed here with direction and payload type.

import type {
  ActiveWindowInfo,
  AppSettings,
  ChatMessage,
  DriftRisk,
  NudgePayload,
  PatternNoticePayload,
  SessionConfig,
  SessionRecord,
  SessionState,
  SessionStatsSnapshot,
  StuckPayload,
} from './types';

export const IPC = {
  // Session lifecycle (renderer -> main)
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_RESET: 'session:reset',

  // Session state broadcasts (main -> renderer)
  SESSION_STATE: 'session:state',
  SESSION_INACTIVE: 'session:inactive',
  SESSION_RECAP: 'session:recap',

  // Window tracking (main -> renderer)
  WINDOW_SWITCH: 'window:switch',

  // Stats (main -> renderer, periodic)
  STATS_UPDATE: 'stats:update',

  // Drift score (main -> renderer)
  DRIFT_SCORE: 'drift:score',

  // Nudges (main -> renderer)
  NUDGE_TRIGGER: 'nudge:trigger',
  NUDGE_ACK: 'nudge:ack',

  // Pattern insights (main -> renderer)
  PATTERN_NOTICE: 'pattern:notice',

  // Stuck mode (main -> renderer + renderer -> main)
  STUCK_ACTIVATE: 'stuck:activate',
  STUCK_SUBMIT: 'stuck:submit',
  STUCK_RESPONSE: 'stuck:response',

  // Ghost chat (renderer -> main, response via main -> renderer)
  CHAT_SEND: 'chat:send',
  CHAT_REPLY: 'chat:reply',

  // Settings (renderer <-> main)
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_CHANGED: 'settings:changed',

  // History
  HISTORY_LIST: 'history:list',

  // Window controls
  WINDOW_SET_OPACITY: 'window:setOpacity',
  WINDOW_SET_ALWAYS_ON_TOP: 'window:setAlwaysOnTop',
  WINDOW_TOGGLE_COLLAPSED: 'window:toggleCollapsed',
  WINDOW_COLLAPSED_STATE: 'window:collapsedState',

  // Dev / demo
  DEV_SIMULATE_SWITCH: 'dev:simulateSwitch',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

// Payload typings keyed by channel for renderer->main invocation
export interface InvokeMap {
  [IPC.SESSION_START]: { input: SessionConfig; output: SessionStatsSnapshot };
  [IPC.SESSION_END]: { input: void; output: SessionRecord };
  [IPC.SESSION_RESET]: { input: void; output: void };
  [IPC.SETTINGS_GET]: { input: void; output: AppSettings };
  [IPC.SETTINGS_UPDATE]: { input: Partial<AppSettings>; output: AppSettings };
  [IPC.HISTORY_LIST]: { input: void; output: SessionRecord[] };
  [IPC.CHAT_SEND]: { input: { text: string }; output: ChatMessage };
  [IPC.STUCK_SUBMIT]: { input: { description: string }; output: ChatMessage };
  [IPC.WINDOW_SET_OPACITY]: { input: number; output: void };
  [IPC.WINDOW_SET_ALWAYS_ON_TOP]: { input: boolean; output: void };
  [IPC.WINDOW_TOGGLE_COLLAPSED]: { input: void; output: boolean };
  [IPC.DEV_SIMULATE_SWITCH]: { input: { app: string; title?: string }; output: void };
}

// Payload typings for main -> renderer broadcast events
export interface EventMap {
  [IPC.SESSION_STATE]: SessionState;
  [IPC.SESSION_INACTIVE]: { sinceMs: number };
  [IPC.SESSION_RECAP]: SessionRecord;
  [IPC.WINDOW_SWITCH]: ActiveWindowInfo;
  [IPC.STATS_UPDATE]: SessionStatsSnapshot;
  [IPC.DRIFT_SCORE]: { score: DriftRisk; raw: number };
  [IPC.NUDGE_TRIGGER]: NudgePayload;
  [IPC.PATTERN_NOTICE]: PatternNoticePayload;
  [IPC.STUCK_ACTIVATE]: StuckPayload;
  [IPC.STUCK_RESPONSE]: ChatMessage;
  [IPC.CHAT_REPLY]: ChatMessage;
  [IPC.SETTINGS_CHANGED]: AppSettings;
  [IPC.WINDOW_COLLAPSED_STATE]: boolean;
}

// Bridge surface that preload exposes to renderer via contextBridge
export interface FocusGhostAPI {
  // invokes
  sessionStart: (cfg: SessionConfig) => Promise<SessionStatsSnapshot>;
  sessionEnd: () => Promise<SessionRecord>;
  sessionReset: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  listHistory: () => Promise<SessionRecord[]>;
  sendChat: (text: string) => Promise<ChatMessage>;
  submitStuck: (description: string) => Promise<ChatMessage>;
  setOpacity: (value: number) => Promise<void>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  toggleCollapsed: () => Promise<boolean>;
  devSimulateSwitch: (app: string, title?: string) => Promise<void>;

  // event subscriptions — return unsubscribe fn
  onSessionState: (cb: (s: SessionState) => void) => () => void;
  onSessionInactive: (cb: (p: { sinceMs: number }) => void) => () => void;
  onSessionRecap: (cb: (r: SessionRecord) => void) => () => void;
  onWindowSwitch: (cb: (w: ActiveWindowInfo) => void) => () => void;
  onStatsUpdate: (cb: (s: SessionStatsSnapshot) => void) => () => void;
  onDriftScore: (cb: (d: { score: DriftRisk; raw: number }) => void) => () => void;
  onNudge: (cb: (n: NudgePayload) => void) => () => void;
  onPatternNotice: (cb: (p: PatternNoticePayload) => void) => () => void;
  onStuckActivate: (cb: (p: StuckPayload) => void) => () => void;
  onStuckResponse: (cb: (m: ChatMessage) => void) => () => void;
  onChatReply: (cb: (m: ChatMessage) => void) => () => void;
  onSettingsChanged: (cb: (s: AppSettings) => void) => () => void;
  onCollapsedState: (cb: (collapsed: boolean) => void) => () => void;
}

declare global {
  interface Window {
    api: FocusGhostAPI;
  }
}
