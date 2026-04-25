// Tracks time since the last activity (window switch / explicit ping).
// Emits 'inactive' when threshold exceeded; resets on activity.
import { EventEmitter } from 'node:events';

export class InactivityTimer extends EventEmitter {
  private lastActivity = Date.now();
  private thresholdMs: number;
  private timer: NodeJS.Timeout | null = null;
  private fired = false;

  constructor(thresholdSec: number) {
    super();
    this.thresholdMs = thresholdSec * 1000;
  }

  setThreshold(thresholdSec: number): void {
    this.thresholdMs = thresholdSec * 1000;
  }

  start(): void {
    this.lastActivity = Date.now();
    this.fired = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  ping(): void {
    this.lastActivity = Date.now();
    if (this.fired) {
      this.fired = false;
      this.emit('resume');
    }
  }

  private check(): void {
    const since = Date.now() - this.lastActivity;
    if (!this.fired && since >= this.thresholdMs) {
      this.fired = true;
      this.emit('inactive', { sinceMs: since });
    }
  }

  msSinceActivity(): number {
    return Date.now() - this.lastActivity;
  }
}
