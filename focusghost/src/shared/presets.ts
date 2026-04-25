// Sensitivity preset bundles applied to nudge engine + drift scorer.
import type { AppSettings, SensitivityPreset } from './types';

export interface PresetBundle {
  driftThresholdMin: number;
  switchTriggerCount: number;
  inactivityThresholdSec: number;
}

export const SENSITIVITY_PRESETS: Record<SensitivityPreset, PresetBundle> = {
  gentle: { driftThresholdMin: 5, switchTriggerCount: 8, inactivityThresholdSec: 90 },
  balanced: { driftThresholdMin: 3, switchTriggerCount: 5, inactivityThresholdSec: 60 },
  strict: { driftThresholdMin: 1.5, switchTriggerCount: 3, inactivityThresholdSec: 30 },
};

export const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: 'balanced',
  ...SENSITIVITY_PRESETS.balanced,
  accent: 'teal',
  alwaysOnTop: false,
  opacity: 1.0,
  defaultDurationMin: 25,
  ghostPersonality: 'encouraging',
  ttsEnabled: false,
  ttsVolume: 0.6,
  demoMode: false,
};

export function applyPreset(preset: SensitivityPreset, current: AppSettings): AppSettings {
  return { ...current, sensitivity: preset, ...SENSITIVITY_PRESETS[preset] };
}
