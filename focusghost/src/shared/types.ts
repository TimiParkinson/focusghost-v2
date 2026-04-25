// Shared type definitions used by main and renderer processes.

export enum SessionState {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  DRIFTING = 'DRIFTING',
  INACTIVE = 'INACTIVE',
  RECAP = 'RECAP',
}

export enum AppCategory {
  FOCUS = 'FOCUS',
  RESEARCH = 'RESEARCH',
  DISTRACTION = 'DISTRACTION',
  UNKNOWN = 'UNKNOWN',
}

export enum DriftRisk {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type SensitivityPreset = 'gentle' | 'balanced' | 'strict';
export type AccentTheme = 'teal' | 'violet' | 'amber';
export type GhostPersonality = 'encouraging' | 'neutral' | 'playful';

export interface AppTimeEntry {
  totalMs: number;
  switches: number;
  category: AppCategory;
  lastSeenAt: number;
}

export type AppTimeMap = Record<string, AppTimeEntry>;

export interface ActiveWindowInfo {
  app: string;
  title: string;
  timestamp: number;
}

export interface SessionConfig {
  taskName: string;
  durationMin: number;
  startedAt: number;
}

export interface SessionStatsSnapshot {
  state: SessionState;
  taskName: string;
  startedAt: number;
  durationMin: number;
  elapsedMs: number;
  remainingMs: number;
  focusMs: number;
  driftMs: number;
  inactiveMs: number;
  switchCount: number;
  nudgeCount: number;
  currentApp: string | null;
  currentAppCategory: AppCategory;
  driftRisk: DriftRisk;
  appTimeMap: AppTimeMap;
}

export interface SessionRecord {
  id: string;
  taskName: string;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  focusMs: number;
  driftMs: number;
  inactiveMs: number;
  switchCount: number;
  nudgeCount: number;
  appTimeMap: AppTimeMap;
  ghostInsight?: string;
  chatLog: ChatMessage[];
}

export type ChatMessageVariant =
  | 'ghost'
  | 'user'
  | 'nudge'
  | 'pattern'
  | 'stuck-prompt'
  | 'stuck-response'
  | 'insight'
  | 'system';

export interface ChatMessage {
  id: string;
  variant: ChatMessageVariant;
  text: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface NudgePayload {
  id: string;
  text: string;
  reason: 'switch-drift' | 'inactivity' | 'check-in' | 'sprint-offer';
  ctas?: { accept?: string; dismiss?: string };
}

export interface StuckPayload {
  id: string;
  recentApps: string[];
  switches: number;
}

export interface PatternNoticePayload {
  id: string;
  text: string;
}

export interface AppSettings {
  sensitivity: SensitivityPreset;
  driftThresholdMin: number;
  switchTriggerCount: number;
  inactivityThresholdSec: number;
  accent: AccentTheme;
  alwaysOnTop: boolean;
  opacity: number; // 0.30 - 1.0
  defaultDurationMin: number;
  ghostPersonality: GhostPersonality;
  ttsEnabled: boolean;
  ttsVolume: number;
  demoMode: boolean;
}
