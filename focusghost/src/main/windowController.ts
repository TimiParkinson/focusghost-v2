import { BrowserWindow, screen as electronScreen } from 'electron';
import { EventEmitter } from 'node:events';
import { IPC, type WindowMode } from '../shared/ipc';
import type { AppSettings, NudgePayload, SessionState } from '../shared/types';

const PANEL_MARGIN = 24;
const PANEL_SIZE = { width: 620, height: 720 };
const COLLAPSED_BAR_SIZE = { width: 620, height: 72 };
const NUDGE_SIZE = { width: 360, height: 160 };
const BLUR_COLLAPSE_DEBOUNCE_MS = 180;

interface ControllerOpts {
  rendererUrl: string | null;
  rendererFile: string;
  preloadPath: string;
}

function getPopupDwellMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2200, Math.min(7000, (words / 220) * 60000));
}

export class WindowController extends EventEmitter {
  private opts: ControllerOpts;
  private mode: WindowMode = 'panel';
  private settings: AppSettings;
  private pinned = false;
  private collapsedBar = false;

  private panel: BrowserWindow | null = null;
  private nudge: BrowserWindow | null = null;

  private blurCollapseTimer: NodeJS.Timeout | null = null;
  private nudgeDismissTimer: NodeJS.Timeout | null = null;
  private panelOrigin: { x: number; y: number } | null = null;

  constructor(opts: ControllerOpts, settings: AppSettings) {
    super();
    this.opts = opts;
    this.settings = settings;
  }

  init(): void {
    this.createPanel();
    this.setMode('panel');
  }

  updateSettings(next: AppSettings): void {
    this.settings = next;
    if (this.panel) {
      this.panel.setOpacity(next.opacity);
      this.panel.setAlwaysOnTop(true, 'floating');
    }
  }

  getMode(): WindowMode {
    return this.mode;
  }

  setMode(mode: WindowMode): void {
    if (!this.panel) return;
    this.mode = mode;

    if (mode === 'collapsed') {
      this.setCollapsedBar(true);
      this.showPanel(false);
    } else if (mode === 'hidden') {
      this.panel.hide();
      if (this.nudge && !this.nudge.isDestroyed()) this.nudge.hide();
    } else {
      if (mode === 'panel' || mode === 'inlineNudge' || mode === 'popupNudge') {
        this.setCollapsedBar(false);
      }
      this.showPanel(mode !== 'inlineNudge');
    }

    this.emit('mode', mode);
  }

  expand(): void {
    this.setMode('panel');
  }

  collapse(): void {
    this.setMode('collapsed');
  }

  setPinned(pinned: boolean): void {
    this.pinned = pinned;
  }

  setCollapsedBar(on: boolean): void {
    this.collapsedBar = on;
    if (!this.panel) return;

    const size = on ? COLLAPSED_BAR_SIZE : PANEL_SIZE;
    this.panel.setContentSize(size.width, size.height);
    this.panel.setResizable(!on);
    this.panel.setMinimumSize(COLLAPSED_BAR_SIZE.width, COLLAPSED_BAR_SIZE.height);
    this.panel.setAlwaysOnTop(true, 'floating');
    this.positionPanel();
  }

  showNudge(payload: NudgePayload): void {
    if (this.nudgeDismissTimer) clearTimeout(this.nudgeDismissTimer);
    if (!this.nudge) this.createNudge();
    if (!this.nudge) return;

    this.positionNudgeNearPanel();
    this.nudge.webContents.send(IPC.NUDGE_TRIGGER, payload);
    this.nudge.showInactive();
    this.mode = 'popupNudge';
    this.emit('mode', 'popupNudge');

    this.nudgeDismissTimer = setTimeout(() => this.dismissNudge(), getPopupDwellMs(payload.text));
  }

  pauseNudgeDismiss(): void {
    if (this.nudgeDismissTimer) {
      clearTimeout(this.nudgeDismissTimer);
      this.nudgeDismissTimer = null;
    }
  }

  resumeNudgeDismiss(text: string): void {
    if (this.nudgeDismissTimer) clearTimeout(this.nudgeDismissTimer);
    this.nudgeDismissTimer = setTimeout(() => this.dismissNudge(), getPopupDwellMs(text));
  }

  dismissNudge(): void {
    if (this.nudgeDismissTimer) {
      clearTimeout(this.nudgeDismissTimer);
      this.nudgeDismissTimer = null;
    }
    if (this.nudge && !this.nudge.isDestroyed()) this.nudge.hide();
    if (this.mode === 'popupNudge') {
      this.mode = this.collapsedBar ? 'collapsed' : 'panel';
      this.emit('mode', this.mode);
    }
  }

  reactToSession(state: SessionState): void {
    if (state === 'ACTIVE' || state === 'RECAP') this.setMode('panel');
    else if (state === 'INACTIVE' && this.mode === 'panel') this.setMode('collapsed');
    else if (state === 'IDLE' && !this.panel?.isVisible()) this.setMode('panel');
  }

  panelWebContents() {
    return this.panel?.webContents ?? null;
  }

  destroy(): void {
    [this.panel, this.nudge].forEach((w) => {
      if (w && !w.isDestroyed()) w.destroy();
    });
    this.panel = this.nudge = null;
  }

  private showPanel(focus: boolean): void {
    if (!this.panel) return;
    this.positionPanel();
    if (!this.panel.isVisible()) this.panel.show();
    if (focus) this.panel.focus();
    this.panel.setOpacity(this.settings.opacity);
  }

  private createPanel(): void {
    const display = electronScreen.getPrimaryDisplay();
    const saved = this.settings.anchorPosition;
    const x =
      saved?.x ??
      Math.round(display.workArea.x + display.workArea.width - PANEL_SIZE.width - PANEL_MARGIN);
    const y = saved?.y ?? Math.round(display.workArea.y + PANEL_MARGIN);
    this.panelOrigin = { x, y };

    this.panel = new BrowserWindow({
      useContentSize: true,
      width: PANEL_SIZE.width,
      height: PANEL_SIZE.height,
      x,
      y,
      frame: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      transparent: false,
      backgroundColor: '#10171d',
      alwaysOnTop: true,
      skipTaskbar: false,
      resizable: true,
      show: false,
      fullscreenable: false,
      webPreferences: {
        preload: this.opts.preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    });

    this.panel.setMinimumSize(COLLAPSED_BAR_SIZE.width, COLLAPSED_BAR_SIZE.height);
    this.panel.setOpacity(this.settings.opacity);
    if (process.platform === 'darwin') this.panel.setHiddenInMissionControl?.(true);
    this.panel.on('move', () => {
      if (!this.panel) return;
      const { x: nextX, y: nextY } = this.panel.getBounds();
      this.panelOrigin = { x: nextX, y: nextY };
      this.emit('panel:moved', this.panelOrigin);
    });
    this.panel.on('blur', () => {
      if (this.pinned) return;
      if (this.mode !== 'panel' && this.mode !== 'inlineNudge') return;
      if (this.blurCollapseTimer) clearTimeout(this.blurCollapseTimer);
      this.blurCollapseTimer = setTimeout(() => {
        if (this.panel && !this.panel.isFocused()) this.collapse();
      }, BLUR_COLLAPSE_DEBOUNCE_MS);
    });
    this.panel.on('focus', () => {
      if (this.blurCollapseTimer) {
        clearTimeout(this.blurCollapseTimer);
        this.blurCollapseTimer = null;
      }
    });

    void this.loadSurface(this.panel, 'panel');
  }

  private createNudge(): void {
    this.nudge = new BrowserWindow({
      width: NUDGE_SIZE.width,
      height: NUDGE_SIZE.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      focusable: false,
      hasShadow: false,
      fullscreenable: false,
      webPreferences: {
        preload: this.opts.preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    });
    this.nudge.setAlwaysOnTop(true, 'floating');
    if (process.platform === 'darwin') this.nudge.setHiddenInMissionControl?.(true);
    this.nudge.on('closed', () => (this.nudge = null));
    void this.loadSurface(this.nudge, 'nudge');
  }

  private positionPanel(): void {
    if (!this.panel) return;
    const display = electronScreen.getPrimaryDisplay();
    const size = this.collapsedBar ? COLLAPSED_BAR_SIZE : PANEL_SIZE;
    const origin = this.panelOrigin ?? {
      x: display.workArea.x + display.workArea.width - size.width - PANEL_MARGIN,
      y: display.workArea.y + PANEL_MARGIN,
    };

    const x = Math.max(
      display.workArea.x + PANEL_MARGIN,
      Math.min(origin.x, display.workArea.x + display.workArea.width - size.width - PANEL_MARGIN),
    );
    const y = Math.max(
      display.workArea.y + PANEL_MARGIN,
      Math.min(origin.y, display.workArea.y + display.workArea.height - size.height - PANEL_MARGIN),
    );

    this.panel.setBounds({ x, y, width: size.width, height: size.height });
  }

  private positionNudgeNearPanel(): void {
    if (!this.panel || !this.nudge) return;
    const p = this.panel.getBounds();
    const display = electronScreen.getPrimaryDisplay();
    const x = Math.max(
      display.workArea.x + PANEL_MARGIN,
      Math.min(p.x + p.width - NUDGE_SIZE.width, display.workArea.x + display.workArea.width - NUDGE_SIZE.width - PANEL_MARGIN),
    );
    const y = Math.min(
      p.y + p.height + 12,
      display.workArea.y + display.workArea.height - NUDGE_SIZE.height - PANEL_MARGIN,
    );
    this.nudge.setBounds({ x, y, width: NUDGE_SIZE.width, height: NUDGE_SIZE.height });
  }

  private async loadSurface(w: BrowserWindow, surface: 'panel' | 'nudge'): Promise<void> {
    if (this.opts.rendererUrl) {
      await w.loadURL(`${this.opts.rendererUrl}?surface=${surface}`);
    } else {
      await w.loadFile(this.opts.rendererFile, { query: { surface } });
    }
  }
}
