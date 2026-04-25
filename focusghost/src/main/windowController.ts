// Multi-surface window controller for FocusGhost.
// Owns 3 BrowserWindows (anchor, panel, nudge) and the WindowMode FSM.
// All OS-level window behavior lives here — renderer only requests transitions.
import { BrowserWindow, screen as electronScreen } from 'electron';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { IPC, type WindowMode } from '../shared/ipc';
import type { AppSettings, NudgePayload, SessionState } from '../shared/types';

const ANCHOR_SIZE = 56;
const ANCHOR_MARGIN = 24;
const PANEL_SIZE = { width: 480, height: 720 };
const NUDGE_SIZE = { width: 360, height: 160 };
const COLLAPSED_BAR_SIZE = { width: 480, height: 44 };
const BLUR_COLLAPSE_DEBOUNCE_MS = 180;

interface ControllerOpts {
  rendererUrl: string | null; // dev URL or null for prod file path
  rendererFile: string; // absolute path to packaged index.html
  preloadPath: string;
}

function getPopupDwellMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2200, Math.min(7000, (words / 220) * 60000));
}

export class WindowController extends EventEmitter {
  private opts: ControllerOpts;
  private mode: WindowMode = 'anchor';
  private settings: AppSettings;
  private pinned = false;
  private anchorPassive = true;
  private collapsedBar = false;

  private anchor: BrowserWindow | null = null;
  private panel: BrowserWindow | null = null;
  private nudge: BrowserWindow | null = null;

  private blurCollapseTimer: NodeJS.Timeout | null = null;
  private nudgeDismissTimer: NodeJS.Timeout | null = null;

  constructor(opts: ControllerOpts, settings: AppSettings) {
    super();
    this.opts = opts;
    this.settings = settings;
  }

  /** Boot the anchor + panel windows. Nudge is created lazily. */
  init(): void {
    this.createAnchor();
    this.createPanel();
    this.setMode('anchor');
  }

  updateSettings(next: AppSettings): void {
    this.settings = next;
    if (this.panel) this.panel.setOpacity(next.opacity);
    if (this.panel) this.panel.setAlwaysOnTop(next.alwaysOnTop);
  }

  // ---- Public API ----
  getMode(): WindowMode {
    return this.mode;
  }

  setMode(mode: WindowMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyMode();
    this.emit('mode', mode);
  }

  expand(): void {
    this.setMode('panel');
  }

  collapse(): void {
    this.setMode('anchor');
  }

  setPinned(pinned: boolean): void {
    this.pinned = pinned;
  }

  setCollapsedBar(on: boolean): void {
    this.collapsedBar = on;
    if (this.mode !== 'panel') return;
    if (!this.panel) return;
    const size = on ? COLLAPSED_BAR_SIZE : PANEL_SIZE;
    this.panel.setSize(size.width, size.height, true);
    this.panel.setResizable(!on);
  }

  /** Renderer reports anchor hover; switch interactivity. */
  setAnchorHover(hovering: boolean): void {
    if (!this.anchor) return;
    this.anchorPassive = !hovering;
    // forward mouse events when passive so the user can click through.
    this.anchor.setIgnoreMouseEvents(this.anchorPassive, { forward: true });
  }

  anchorClicked(): void {
    this.expand();
  }

  /** Display a nudge as a separate transient window. Auto-dismisses based on text length. */
  showNudge(payload: NudgePayload): void {
    if (this.nudgeDismissTimer) clearTimeout(this.nudgeDismissTimer);
    if (!this.nudge) this.createNudge();
    if (!this.nudge) return;

    this.positionNudgeNearAnchor();
    // Push payload to nudge renderer
    this.nudge.webContents.send(IPC.NUDGE_TRIGGER, payload);
    this.nudge.showInactive();
    this.setMode('popupNudge');

    const dwell = getPopupDwellMs(payload.text);
    this.nudgeDismissTimer = setTimeout(() => this.dismissNudge(), dwell);
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
    if (this.mode === 'popupNudge') this.setMode(this.panel?.isVisible() ? 'panel' : 'anchor');
  }

  reactToSession(state: SessionState): void {
    // Window behaviour reacts to session state.
    if (state === 'IDLE') this.setMode('anchor');
    else if (state === 'ACTIVE' || state === 'RECAP') this.setMode('panel');
    else if (state === 'INACTIVE' && this.mode === 'panel') {
      // keep panel but the renderer can show idle overlay; do nothing window-side
    }
  }

  /** Used by main.ts when broadcasting events that should reach the panel renderer. */
  panelWebContents() {
    return this.panel?.webContents ?? null;
  }

  destroy(): void {
    [this.anchor, this.panel, this.nudge].forEach((w) => {
      if (w && !w.isDestroyed()) w.destroy();
    });
    this.anchor = this.panel = this.nudge = null;
  }

  // ---- internals ----
  private applyMode(): void {
    if (!this.anchor || !this.panel) return;
    switch (this.mode) {
      case 'anchor':
        this.anchor.show();
        this.fadePanelOut();
        if (this.nudge && !this.nudge.isDestroyed()) this.nudge.hide();
        break;
      case 'panel':
        this.fadePanelIn();
        // Keep anchor visible behind panel? Hide it for clarity on macOS.
        this.anchor.hide();
        break;
      case 'popupNudge':
        // anchor stays passive; panel state preserved.
        break;
      case 'inlineNudge':
        // managed inside panel renderer; nothing OS-level needed.
        break;
      case 'hidden':
        this.anchor.hide();
        this.panel.hide();
        if (this.nudge && !this.nudge.isDestroyed()) this.nudge.hide();
        break;
    }
  }

  private fadePanelIn(): void {
    if (!this.panel) return;
    this.positionPanelAtAnchor();
    if (!this.panel.isVisible()) this.panel.show();
    this.panel.focus();
    this.panel.setOpacity(this.settings.opacity);
  }

  private fadePanelOut(): void {
    if (!this.panel) return;
    if (this.panel.isVisible()) this.panel.hide();
  }

  private createAnchor(): void {
    const display = electronScreen.getPrimaryDisplay();
    const x = Math.round(display.workArea.x + display.workArea.width - ANCHOR_SIZE - ANCHOR_MARGIN);
    const y = Math.round(display.workArea.y + ANCHOR_MARGIN);

    this.anchor = new BrowserWindow({
      width: ANCHOR_SIZE,
      height: ANCHOR_SIZE,
      x,
      y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      hasShadow: false,
      fullscreenable: false,
      minimizable: false,
      maximizable: false,
      focusable: true,
      webPreferences: {
        preload: this.opts.preloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    });
    this.anchor.setAlwaysOnTop(true, 'floating');
    this.anchor.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.platform === 'darwin') this.anchor.setHiddenInMissionControl?.(true);
    // start passive (click-through)
    this.anchor.setIgnoreMouseEvents(true, { forward: true });
    void this.loadSurface(this.anchor, 'anchor');
  }

  private createPanel(): void {
    const display = electronScreen.getPrimaryDisplay();
    const x = Math.round(
      display.workArea.x + display.workArea.width - PANEL_SIZE.width - ANCHOR_MARGIN,
    );
    const y = Math.round(display.workArea.y + ANCHOR_MARGIN + ANCHOR_SIZE + 8);

    this.panel = new BrowserWindow({
      width: PANEL_SIZE.width,
      height: PANEL_SIZE.height,
      x,
      y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: this.settings.alwaysOnTop,
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
    this.panel.setOpacity(this.settings.opacity);
    if (process.platform === 'darwin') this.panel.setHiddenInMissionControl?.(true);
    void this.loadSurface(this.panel, 'panel');

    this.panel.on('blur', () => {
      if (this.pinned) return;
      if (this.mode !== 'panel') return;
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

  private positionPanelAtAnchor(): void {
    if (!this.anchor || !this.panel) return;
    const a = this.anchor.getBounds();
    const display = electronScreen.getPrimaryDisplay();
    const x = Math.min(
      a.x + a.width - PANEL_SIZE.width,
      display.workArea.x + display.workArea.width - PANEL_SIZE.width - ANCHOR_MARGIN,
    );
    const y = a.y + a.height + 8;
    this.panel.setBounds({
      x: Math.max(display.workArea.x + ANCHOR_MARGIN, x),
      y,
      width: PANEL_SIZE.width,
      height: PANEL_SIZE.height,
    });
  }

  private positionNudgeNearAnchor(): void {
    if (!this.anchor || !this.nudge) return;
    const a = this.anchor.getBounds();
    const display = electronScreen.getPrimaryDisplay();
    const x = Math.min(
      a.x + a.width - NUDGE_SIZE.width,
      display.workArea.x + display.workArea.width - NUDGE_SIZE.width - ANCHOR_MARGIN,
    );
    const y = a.y + a.height + 8;
    this.nudge.setBounds({
      x: Math.max(display.workArea.x + ANCHOR_MARGIN, x),
      y,
      width: NUDGE_SIZE.width,
      height: NUDGE_SIZE.height,
    });
  }

  private async loadSurface(w: BrowserWindow, surface: 'anchor' | 'panel' | 'nudge'): Promise<void> {
    if (this.opts.rendererUrl) {
      await w.loadURL(`${this.opts.rendererUrl}?surface=${surface}`);
    } else {
      await w.loadFile(this.opts.rendererFile, { query: { surface } });
    }
  }
}
