// Polls the OS active window via active-win and emits switches.
// Falls back to a no-op poll if active-win is unavailable (e.g. demo / unsupported OS).
import { EventEmitter } from 'node:events';
import type { ActiveWindowInfo } from '../shared/types';

const POLL_MS = 500;

type ActiveWinFn = () => Promise<{ owner?: { name?: string }; title?: string } | undefined>;

export class WindowTracker extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private last: ActiveWindowInfo | null = null;
  private activeWin: ActiveWinFn | null = null;
  private manualMode = false;

  async start(): Promise<void> {
    if (this.timer) return;
    if (!this.manualMode) {
      try {
        const mod: any = await import('active-win');
        this.activeWin = (mod.default ?? mod) as ActiveWinFn;
      } catch (err) {
        // active-win can fail on first run (mac accessibility) or in headless env.
        // We continue with manual-only mode.
        // eslint-disable-next-line no-console
        console.warn('[WindowTracker] active-win unavailable, manual mode only:', (err as Error).message);
        this.manualMode = true;
      }
    }
    this.timer = setInterval(() => this.poll().catch(() => {}), POLL_MS);
    // Kick once immediately
    this.poll().catch(() => {});
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Allows demo mode / dev tools to inject a switch as if it came from the OS. */
  injectSwitch(app: string, title = ''): void {
    this.handleSwitch({ app, title, timestamp: Date.now() });
  }

  setManualMode(on: boolean): void {
    this.manualMode = on;
    if (on) this.activeWin = null;
  }

  private async poll(): Promise<void> {
    if (this.manualMode || !this.activeWin) return;
    try {
      const win = await this.activeWin();
      if (!win) return;
      const app = win.owner?.name ?? 'Unknown';
      const title = win.title ?? '';
      this.handleSwitch({ app, title, timestamp: Date.now() });
    } catch {
      // ignore single-poll failures
    }
  }

  private handleSwitch(info: ActiveWindowInfo): void {
    if (this.last && this.last.app === info.app && this.last.title === info.title) return;
    this.last = info;
    this.emit('switch', info);
  }
}
