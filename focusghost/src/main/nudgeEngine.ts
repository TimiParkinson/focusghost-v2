// Decides when to fire nudges based on session signals + sensitivity preset.
import { EventEmitter } from 'node:events';
import type { AppSettings } from '../shared/types';

interface NudgeContext {
  switchCount: number;
  driftMs: number;
  inactiveMs: number;
  focusMs: number;
  elapsedMs: number;
  settings: AppSettings;
}

export class NudgeEngine extends EventEmitter {
  private lastNudgeAt = 0;
  private lastSwitchSnapshot = 0;
  private lastFocusCheckIn = 0;
  private nudgeCount = 0;

  reset(): void {
    this.lastNudgeAt = 0;
    this.lastSwitchSnapshot = 0;
    this.lastFocusCheckIn = 0;
    this.nudgeCount = 0;
  }

  count(): number {
    return this.nudgeCount;
  }

  evaluate(ctx: NudgeContext): void {
    const now = Date.now();
    const cooldown = 60_000;
    if (now - this.lastNudgeAt < cooldown) return;

    const { settings } = ctx;
    // 1) Switch-drift: more than threshold switches since last check
    const switchesSinceLast = ctx.switchCount - this.lastSwitchSnapshot;
    if (switchesSinceLast >= settings.switchTriggerCount) {
      this.lastSwitchSnapshot = ctx.switchCount;
      this.fire('switch-drift', { switchesSinceLast });
      return;
    }

    // 2) Drift time crossed threshold
    if (ctx.driftMs >= settings.driftThresholdMin * 60_000) {
      this.fire('switch-drift', { driftMs: ctx.driftMs });
      return;
    }

    // 3) Positive check-in every ~10 min of clean focus
    if (ctx.focusMs - this.lastFocusCheckIn >= 10 * 60_000) {
      this.lastFocusCheckIn = ctx.focusMs;
      this.fire('check-in', { focusMs: ctx.focusMs });
      return;
    }
  }

  triggerInactivity(): void {
    const now = Date.now();
    if (now - this.lastNudgeAt < 30_000) return;
    this.fire('inactivity', {});
  }

  private fire(reason: 'switch-drift' | 'inactivity' | 'check-in' | 'sprint-offer', meta: any): void {
    this.lastNudgeAt = Date.now();
    this.nudgeCount += 1;
    this.emit('nudge', { reason, meta });
  }
}
