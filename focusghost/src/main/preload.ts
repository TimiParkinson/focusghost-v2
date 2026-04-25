// Preload script — exposes a typed FocusGhostAPI to the renderer via contextBridge.
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type FocusGhostAPI } from '../shared/ipc';

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_evt: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener as any);
  return () => ipcRenderer.removeListener(channel, listener as any);
}

const api: FocusGhostAPI = {
  sessionStart: (cfg) => ipcRenderer.invoke(IPC.SESSION_START, cfg),
  sessionEnd: () => ipcRenderer.invoke(IPC.SESSION_END),
  sessionReset: () => ipcRenderer.invoke(IPC.SESSION_RESET),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch),
  listHistory: () => ipcRenderer.invoke(IPC.HISTORY_LIST),
  sendChat: (text) => ipcRenderer.invoke(IPC.CHAT_SEND, { text }),
  submitStuck: (description) => ipcRenderer.invoke(IPC.STUCK_SUBMIT, { description }),
  setOpacity: (v) => ipcRenderer.invoke(IPC.WINDOW_SET_OPACITY, v),
  setAlwaysOnTop: (v) => ipcRenderer.invoke(IPC.WINDOW_SET_ALWAYS_ON_TOP, v),
  toggleCollapsed: () => ipcRenderer.invoke(IPC.WINDOW_TOGGLE_COLLAPSED),
  devSimulateSwitch: (app, title) => ipcRenderer.invoke(IPC.DEV_SIMULATE_SWITCH, { app, title }),

  onSessionState: (cb) => on(IPC.SESSION_STATE, cb),
  onSessionInactive: (cb) => on(IPC.SESSION_INACTIVE, cb),
  onSessionRecap: (cb) => on(IPC.SESSION_RECAP, cb),
  onWindowSwitch: (cb) => on(IPC.WINDOW_SWITCH, cb),
  onStatsUpdate: (cb) => on(IPC.STATS_UPDATE, cb),
  onDriftScore: (cb) => on(IPC.DRIFT_SCORE, cb),
  onNudge: (cb) => on(IPC.NUDGE_TRIGGER, cb),
  onPatternNotice: (cb) => on(IPC.PATTERN_NOTICE, cb),
  onStuckActivate: (cb) => on(IPC.STUCK_ACTIVATE, cb),
  onStuckResponse: (cb) => on(IPC.STUCK_RESPONSE, cb),
  onChatReply: (cb) => on(IPC.CHAT_REPLY, cb),
  onSettingsChanged: (cb) => on(IPC.SETTINGS_CHANGED, cb),
  onCollapsedState: (cb) => on(IPC.WINDOW_COLLAPSED_STATE, cb),
};

contextBridge.exposeInMainWorld('api', api);
