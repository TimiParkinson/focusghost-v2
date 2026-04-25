// Detects "Stuck Mode" pattern: rapid cycling between ≤3 apps in a short window.
import { EventEmitter } from 'node:events';

interface SwitchEvent {
  app: string;
  at: number;
}

const WINDOW_MS = 4 * 60_000; // 4 minutes
const MIN_SWITCHES = 6;
const MAX_DISTINCT_APPS = 3;
const MAX_AVG_DWELL_MS = 90_000;
const COOLDOWN_MS = 10 * 60_000;

export class StuckDetector extends EventEmitter {
  private events: SwitchEvent[] = [];
  private lastFiredAt = 0;
  private sensitivityMul = 1;

  setSensitivity(mul: number): void {
    this.sensitivityMul = Math.max(0.5, Math.min(2, mul));
  }

  reset(): void {
    this.events = [];
    this.lastFiredAt = 0;
  }

  recordSwitch(app: string): void {
    const now = Date.now();
    this.events.push({ app, at: now });
    // prune
    const cutoff = now - WINDOW_MS;
    this.events = this.events.filter((e) => e.at >= cutoff);
    this.evaluate(now);
  }

  private evaluate(now: number): void {
    if (now - this.lastFiredAt < COOLDOWN_MS) return;
    const minSwitches = Math.round(MIN_SWITCHES / this.sensitivityMul);
    if (this.events.length < minSwitches) return;

    const distinct = new Set(this.events.map((e) => e.app));
    if (distinct.size > MAX_DISTINCT_APPS) return;

    const span = now - this.events[0].at;
    const avgDwell = span / Math.max(1, this.events.length - 1);
    if (avgDwell > MAX_AVG_DWELL_MS) return;

    this.lastFiredAt = now;
    const recent = Array.from(distinct);
    this.emit('stuck', { recentApps: recent, switches: this.events.length });
  }
}
