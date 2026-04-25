// Drift risk scorer: weights recent switches + distraction % + inactivity.
import { AppCategory, DriftRisk, type AppTimeMap } from '../shared/types';

export interface ScoreInput {
  switchesLastWindow: number;
  appTimeMap: AppTimeMap;
  inactiveMs: number;
  elapsedMs: number;
  switchTriggerCount: number;
}

export function scoreDrift(input: ScoreInput): { score: DriftRisk; raw: number } {
  const { switchesLastWindow, appTimeMap, inactiveMs, elapsedMs, switchTriggerCount } = input;
  let distractionMs = 0;
  let total = 0;
  for (const v of Object.values(appTimeMap)) {
    total += v.totalMs;
    if (v.category === AppCategory.DISTRACTION) distractionMs += v.totalMs;
  }
  const distractionPct = total > 0 ? distractionMs / total : 0;
  const inactivityPct = elapsedMs > 0 ? Math.min(1, inactiveMs / elapsedMs) : 0;
  const switchPct = Math.min(1, switchesLastWindow / Math.max(1, switchTriggerCount));

  // Weighted: switches 0.45, distraction 0.40, inactivity 0.15
  const raw = 0.45 * switchPct + 0.4 * distractionPct + 0.15 * inactivityPct;
  let score: DriftRisk = DriftRisk.LOW;
  if (raw >= 0.66) score = DriftRisk.HIGH;
  else if (raw >= 0.33) score = DriftRisk.MEDIUM;
  return { score, raw };
}
