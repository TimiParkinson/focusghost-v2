// Per-app time tracker + switch counter. Updates on every window:switch event.
import { categorizeApp } from './appCategories';
import { getCategoryOverrides } from './persistence';
import { AppCategory, type AppTimeMap } from '../shared/types';

export class StatsTracker {
  private map: AppTimeMap = {};
  private currentApp: string | null = null;
  private currentStart = 0;
  private switchCount = 0;
  private focusMs = 0;
  private driftMs = 0;
  private inactiveMs = 0;

  reset(): void {
    this.map = {};
    this.currentApp = null;
    this.currentStart = 0;
    this.switchCount = 0;
    this.focusMs = 0;
    this.driftMs = 0;
    this.inactiveMs = 0;
  }

  /** Called on every detected window switch (or initial app set). */
  recordSwitch(app: string, at: number = Date.now()): void {
    if (this.currentApp && this.currentStart) {
      const elapsed = Math.max(0, at - this.currentStart);
      this.commitElapsed(this.currentApp, elapsed);
    }
    if (this.currentApp && this.currentApp !== app) {
      this.switchCount += 1;
    }
    this.currentApp = app;
    this.currentStart = at;
    this.touch(app);
  }

  /** Add elapsed time to the current app (called periodically without switching). */
  tick(now: number = Date.now()): void {
    if (!this.currentApp || !this.currentStart) return;
    const delta = Math.max(0, now - this.currentStart);
    if (delta < 250) return;
    this.commitElapsed(this.currentApp, delta);
    this.currentStart = now;
  }

  recordInactive(ms: number): void {
    this.inactiveMs += ms;
  }

  private commitElapsed(app: string, ms: number): void {
    const overrides = getCategoryOverrides();
    const cat = categorizeApp(app, overrides);
    const entry = this.map[app] ?? { totalMs: 0, switches: 0, category: cat, lastSeenAt: Date.now() };
    entry.totalMs += ms;
    entry.lastSeenAt = Date.now();
    entry.category = cat;
    this.map[app] = entry;

    if (cat === AppCategory.FOCUS || cat === AppCategory.RESEARCH) this.focusMs += ms;
    else if (cat === AppCategory.DISTRACTION) this.driftMs += ms;
    // UNKNOWN bucket counts toward neither
  }

  private touch(app: string): void {
    if (this.map[app]) {
      this.map[app].switches += 1;
      return;
    }
    const overrides = getCategoryOverrides();
    this.map[app] = {
      totalMs: 0,
      switches: 1,
      category: categorizeApp(app, overrides),
      lastSeenAt: Date.now(),
    };
  }

  snapshot(): {
    appTimeMap: AppTimeMap;
    switchCount: number;
    focusMs: number;
    driftMs: number;
    inactiveMs: number;
    currentApp: string | null;
  } {
    // pull live (uncommitted) elapsed into snapshot copy without mutating commits
    const liveMap: AppTimeMap = {};
    for (const [k, v] of Object.entries(this.map)) liveMap[k] = { ...v };
    let focus = this.focusMs;
    let drift = this.driftMs;
    if (this.currentApp && this.currentStart) {
      const live = Math.max(0, Date.now() - this.currentStart);
      const entry = liveMap[this.currentApp];
      if (entry) {
        entry.totalMs += live;
        if (entry.category === AppCategory.FOCUS || entry.category === AppCategory.RESEARCH) focus += live;
        else if (entry.category === AppCategory.DISTRACTION) drift += live;
      }
    }
    return {
      appTimeMap: liveMap,
      switchCount: this.switchCount,
      focusMs: focus,
      driftMs: drift,
      inactiveMs: this.inactiveMs,
      currentApp: this.currentApp,
    };
  }
}
