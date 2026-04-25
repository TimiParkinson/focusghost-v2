// Zustand store — single source of truth for renderer UI state.
import { create } from 'zustand';
import {
  DriftRisk,
  SessionState,
  type AppSettings,
  type ChatMessage,
  type NudgePayload,
  type PatternNoticePayload,
  type SessionRecord,
  type SessionStatsSnapshot,
  type StuckPayload,
} from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/presets';

export type Screen = 'task' | 'active' | 'chat' | 'recap' | 'settings';

interface UIState {
  screen: Screen;
  collapsed: boolean;
  settings: AppSettings;
  state: SessionState;
  driftRisk: DriftRisk;
  stats: SessionStatsSnapshot | null;
  recap: SessionRecord | null;
  chat: ChatMessage[];
  pendingNudge: NudgePayload | null;
  pendingStuck: StuckPayload | null;
  chatInputBusy: boolean;

  setScreen: (s: Screen) => void;
  setCollapsed: (b: boolean) => void;
  setSettings: (s: AppSettings) => void;
  setState: (s: SessionState) => void;
  setStats: (s: SessionStatsSnapshot) => void;
  setRecap: (r: SessionRecord) => void;
  appendChat: (m: ChatMessage | ChatMessage[]) => void;
  setPendingNudge: (n: NudgePayload | null) => void;
  setPendingStuck: (s: StuckPayload | null) => void;
  addPattern: (p: PatternNoticePayload) => void;
  setChatBusy: (b: boolean) => void;
  resetChat: () => void;
}

export const useUI = create<UIState>((set) => ({
  screen: 'task',
  collapsed: false,
  settings: DEFAULT_SETTINGS,
  state: SessionState.IDLE,
  driftRisk: DriftRisk.LOW,
  stats: null,
  recap: null,
  chat: [],
  pendingNudge: null,
  pendingStuck: null,
  chatInputBusy: false,

  setScreen: (screen) => set({ screen }),
  setCollapsed: (collapsed) => set({ collapsed }),
  setSettings: (settings) => set({ settings }),
  setState: (state) => set({ state }),
  setStats: (stats) => set({ stats, driftRisk: stats.driftRisk }),
  setRecap: (recap) => set({ recap, screen: 'recap' }),
  appendChat: (m) =>
    set((s) => ({ chat: [...s.chat, ...(Array.isArray(m) ? m : [m])] })),
  setPendingNudge: (pendingNudge) => set({ pendingNudge }),
  setPendingStuck: (pendingStuck) => set({ pendingStuck }),
  addPattern: (p) =>
    set((s) => ({
      chat: [
        ...s.chat,
        { id: p.id, variant: 'pattern', text: p.text, timestamp: Date.now() },
      ],
    })),
  setChatBusy: (chatInputBusy) => set({ chatInputBusy }),
  resetChat: () => set({ chat: [], pendingNudge: null, pendingStuck: null }),
}));
