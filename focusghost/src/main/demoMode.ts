// Demo mode: scripted switch sequence + auto-trigger nudge / stuck / end.
import type { WindowTracker } from './windowTracker';

interface DemoController {
  start: () => void;
  stop: () => void;
}

interface DemoOpts {
  tracker: WindowTracker;
  onNudge: () => void;
  onStuck: () => void;
  onEnd: () => void;
}

export function createDemoMode(opts: DemoOpts): DemoController {
  let timers: NodeJS.Timeout[] = [];

  const SEQUENCE = [
    { app: 'Code', title: 'focusghost / sessionMachine.ts', delayMs: 0 },
    { app: 'Twitter', title: 'home', delayMs: 30_000 },
    { app: 'YouTube', title: 'recommended for you', delayMs: 50_000 },
    { app: 'Code', title: 'focusghost / sessionMachine.ts', delayMs: 80_000 },
    { app: 'Chrome', title: 'stack overflow / typescript', delayMs: 110_000 },
    { app: 'Code', title: 'focusghost / sessionMachine.ts', delayMs: 140_000 },
    { app: 'Chrome', title: 'reddit / r/programming', delayMs: 170_000 },
    { app: 'Code', title: 'focusghost / sessionMachine.ts', delayMs: 200_000 },
    { app: 'Chrome', title: 'stack overflow / typescript', delayMs: 220_000 },
    { app: 'Code', title: 'focusghost / sessionMachine.ts', delayMs: 240_000 },
  ];

  return {
    start() {
      // force tracker into manual mode so the OS poll doesn't fight us
      opts.tracker.setManualMode(true);
      for (const step of SEQUENCE) {
        timers.push(setTimeout(() => opts.tracker.injectSwitch(step.app, step.title), step.delayMs));
      }
      timers.push(setTimeout(opts.onNudge, 120_000)); // 2 min
      timers.push(setTimeout(opts.onStuck, 240_000)); // 4 min
      timers.push(setTimeout(opts.onEnd, 360_000)); // 6 min
    },
    stop() {
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
}
