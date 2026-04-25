// Svelte writable stores — single source of truth for renderer UI state.
import { writable, derived, get } from 'svelte/store';
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

export type Screen = 'task' | 'active' | 'chat' | 'recap' | 'settings' | 'history' | 'categories';

export const screen = writable<Screen>('task');
export const collapsed = writable<boolean>(false);
export const settings = writable<AppSettings>(DEFAULT_SETTINGS);
export const sessionState = writable<SessionState>(SessionState.IDLE);
export const driftRisk = writable<DriftRisk>(DriftRisk.LOW);
export const stats = writable<SessionStatsSnapshot | null>(null);
export const recap = writable<SessionRecord | null>(null);
export const chat = writable<ChatMessage[]>([]);
export const pendingNudge = writable<NudgePayload | null>(null);
export const pendingStuck = writable<StuckPayload | null>(null);
export const chatBusy = writable<boolean>(false);

export function appendChat(m: ChatMessage | ChatMessage[]): void {
  chat.update((cur) => [...cur, ...(Array.isArray(m) ? m : [m])]);
}

export function addPattern(p: PatternNoticePayload): void {
  appendChat({ id: p.id, variant: 'pattern', text: p.text, timestamp: Date.now() });
}

export function resetChat(): void {
  chat.set([]);
  pendingNudge.set(null);
  pendingStuck.set(null);
}

export function setStatsAndRisk(s: SessionStatsSnapshot): void {
  stats.set(s);
  driftRisk.set(s.driftRisk);
}

export function currentScreen(): Screen {
  return get(screen);
}

export const isCollapsed = derived(collapsed, ($c) => $c);
