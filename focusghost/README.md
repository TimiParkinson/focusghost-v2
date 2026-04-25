# FocusGhost

> Desktop AI focus companion — Electron + **Svelte** + TypeScript + Gemini.

FocusGhost watches your active window in the background, learns when you're drifting from your declared task, and surfaces calm, AI-generated nudges from a friendly ghost mascot. When it notices you cycling between the same few apps for a long time it triggers **Stuck Mode** and asks Gemini to help you reframe + take three concrete next steps.

## Tech stack

- **electron-vite** + **Svelte 5** (runes) + **TypeScript** + **Tailwind CSS**
- **electron-builder** for cross-platform makers (DMG / NSIS / DEB / RPM / AppImage)
- **electron-store** for local persistence (sessions, settings, app categories)
- **active-win** for OS-level window polling
- **@google/generative-ai** for Gemini calls (main process only — key never reaches renderer)
- **GSAP** for mascot + screen entrance animations
- Svelte writable stores for renderer state

## Architecture

```
src/
├── shared/                    # IPC contract + types + presets (cross-process)
├── main/                      # Electron main process
│   ├── main.ts                # entry — wires session modules + IPC handlers
│   ├── windowController.ts    # owns 3 BrowserWindows + WindowMode FSM
│   ├── preload.ts             # contextBridge → window.api
│   ├── windowTracker.ts       # active-win polling
│   ├── sessionMachine.ts      # IDLE ↔ ACTIVE ↔ DRIFTING ↔ INACTIVE → RECAP
│   ├── statsTracker.ts        # per-app time + switches
│   ├── inactivityTimer.ts
│   ├── driftScorer.ts
│   ├── stuckDetector.ts
│   ├── nudgeEngine.ts
│   ├── gemini.ts              # main-process-only Gemini wrapper
│   ├── prompts.ts
│   ├── persistence.ts         # electron-store
│   ├── appCategories.ts
│   ├── streaks.ts
│   └── demoMode.ts
└── renderer/                  # Svelte 5 + Tailwind
    ├── index.html             # surface-aware: ?surface=anchor|panel|nudge
    ├── main.ts                # mounts AnchorRoot / NudgeRoot / App by surface
    ├── App.svelte             # panel root: tab nav + 7 screens
    ├── AnchorRoot.svelte      # passive ambient pill surface
    ├── NudgeRoot.svelte       # popup nudge surface
    ├── stores.ts              # session / chat / settings writables
    ├── window.ts              # window-mode store + readSurface()
    ├── api.ts                 # window.api wrapper + browser-mock
    ├── components/            # Ghost, Header, ChatMessage, StuckCard, CollapsedBar
    └── screens/               # TaskDeclaration, ActiveSession, GhostChat, Recap, Settings, History, CategoryEditor
```

### Multi-surface window architecture

`WindowController` (main process) owns three transparent frameless `BrowserWindow`s and a `WindowMode` FSM:

| Mode | Surface | Behaviour |
| --- | --- | --- |
| `anchor` | 56×56 ambient pill, top-right | Click-through when passive (`setIgnoreMouseEvents(true, { forward: true })`). Hover restores interactivity. Click expands to panel. |
| `panel` | 480×720 main UI | Opens at the anchor's position. Auto-collapses to anchor on `blur` after 180 ms (debounced) unless pinned. |
| `popupNudge` | 360×160 transient | Separate `focusable: false` window. Auto-dismiss timer is computed from text length: `max(2200ms, min(7000ms, words / 220 * 60000))`. Hover pauses dismiss. Click opens panel. |
| `inlineNudge` | rendered inside panel | UI-only — no separate window. |
| `hidden` | all 3 hidden | Used for full quiet mode. |

The renderer subscribes to `window:modeChanged` and never calls `BrowserWindow` APIs directly — all OS-level behaviour is owned by `WindowController`. Each surface loads `index.html?surface=...`; `main.ts` reads the query param and mounts the matching root component.

### macOS-utility behaviour

- `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `hiddenInMissionControl: true`, `fullscreenable: false`
- Anchor + nudge use `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
- Nudge calls `showInactive()` (no focus theft) and is `focusable: false`
- Reading-time auto-dismiss instead of fixed timeout

## IPC contract (living document)

All channels are constants in `src/shared/ipc.ts` with typed payloads in `src/shared/types.ts`.

| channel | direction | payload |
| --- | --- | --- |
| `session:start` | renderer → main (invoke) | `SessionConfig` |
| `session:end` | renderer → main (invoke) | → `SessionRecord` |
| `session:state` | main → renderer | `SessionState` |
| `session:inactive` | main → renderer | `{ sinceMs }` |
| `session:recap` | main → renderer | `SessionRecord` |
| `window:switch` | main → renderer | `ActiveWindowInfo` |
| `stats:update` | main → renderer (~1Hz) | `SessionStatsSnapshot` |
| `drift:score` | main → renderer (every 30s) | `{ score, raw }` |
| `nudge:trigger` | main → renderer | `NudgePayload` |
| `pattern:notice` | main → renderer (every 15m) | `PatternNoticePayload` |
| `stuck:activate` | main → renderer | `StuckPayload` |
| `stuck:submit` | renderer → main (invoke) | → ChatMessage (response) |
| `chat:send` | renderer → main (invoke) | → ChatMessage (reply) |
| `settings:get` / `settings:update` | renderer → main (invoke) | `AppSettings` |
| `window:setOpacity` / `setAlwaysOnTop` / `toggleCollapsed` | renderer → main (invoke) | — |

## Setup & run

```bash
yarn install
cp .env.example .env
# put your Gemini key in .env (get one at https://aistudio.google.com/apikey)
yarn dev              # launches Electron with hot-reload (electron-vite)
yarn dev:demo         # demo mode (scripted switches + auto nudge/stuck/end)
yarn build            # bundles main + preload + renderer into ./out
yarn check            # svelte-check type-check
```

### Build installers

FocusGhost ships builds for **macOS**, **Windows**, and major **Linux** distributions via `electron-builder`. Build on the matching host OS for best results.

```bash
yarn make:mac     # produces .dmg + .zip in ./release
yarn make:win     # produces NSIS .exe installer + portable .zip
yarn make:linux   # produces AppImage + .deb + .rpm
yarn make         # produce everything available for the current host
```

Maker matrix (configured in `electron-builder.yml`):

| Platform | Format | Maker |
| --- | --- | --- |
| macOS (Intel + Apple Silicon) | `.dmg`, `.zip` | electron-builder `dmg`, `zip` |
| Windows (10 / 11) | NSIS `.exe` installer + portable `.zip` | electron-builder `nsis`, `zip` |
| Debian / Ubuntu / Pop!_OS / Mint | `.deb` | electron-builder `deb` |
| Fedora / RHEL / CentOS | `.rpm` | electron-builder `rpm` |
| Linux portable / generic | `.AppImage` | electron-builder `AppImage` |

### Platform notes

- **macOS** — `active-win` requires **Accessibility** permission. On first launch, macOS will prompt you; grant access in *System Settings → Privacy & Security → Accessibility*. The transparent frameless window relies on the standard Electron vibrancy stack.
- **Windows 10 / 11** — Works out of the box. Squirrel handles auto-update plumbing if you publish releases via `yarn publish`. SmartScreen may flag unsigned builds — code-signing certificate is recommended for distribution.
- **Linux** — Tested against X11 sessions on Debian / Ubuntu / Fedora. **Wayland** sessions don't expose active window info to userspace tools, so `active-win` falls back to manual mode (you can still use FocusGhost — switches won't auto-detect; the simulate-switch dev button + scripted demo mode still work). If you're on GNOME Wayland, switch to "GNOME on Xorg" at the login screen for full functionality.

### Gemini key

Set `GEMINI_API_KEY` in `.env`. Get one at <https://aistudio.google.com/apikey>. Without it, the app still runs — it falls back to deterministic offline responses for nudges, insights, and Stuck Mode so you can develop without a key.

Default model is `gemini-2.5-flash`. Override via `GEMINI_MODEL` in `.env`.

### macOS permissions

`active-win` needs **Accessibility** permission on macOS — grant it in System Settings → Privacy & Security on first launch.

## Backlog (now implemented)

- ✅ Multi-session history view with collapsible per-session detail
- ✅ Cross-session focus streak tracking + 30-day heatmap (qualifying = ≥10 min focus)
- ✅ Custom app category editor UI (override + add custom apps)
- ✅ Cross-platform makers (macOS DMG, Windows Squirrel, Linux DEB + RPM)

## Design system

- **Theme** — solid dark background, three accent themes (teal default, violet, amber) wired via CSS custom properties
- **Typography** — JetBrains Mono for body, Space Grotesk for display
- **Mascot** — pure SVG ghost, GSAP-driven float + blink, color shifts to coral when drifting and amber when inactive
- **Layout** — single column, asymmetric, generous spacing
- **Frameless window** — custom drag region, opacity slider (cycles 100/75/45 from collapsed bar), always-on-top toggle, collapsed bar mode (~36px)

## Sprint coverage

- ✅ **Sprint 1 — Core Engine** — scaffold, IPC contract, active-window tracker, session FSM, per-app time tracker, inactivity timer, electron-store, app categorization, drift scorer
- ✅ **Sprint 2 — UI & Chat** — 4 screens, collapsed bar, opacity controls, ghost mascot
- ✅ **Sprint 3 — Ghost AI** — Gemini integration, drift nudge templates, pattern notice, freeform chat, ghost insight, stuck mode trigger + overlay + structured response
- ✅ **Sprint 4 — Polish** — settings panel, sensitivity presets, accent themes, demo script, GSAP animations across mascot + screens
- ⏳ **Stretch** — ElevenLabs voice nudges (settings toggles wired, SDK not bundled), Lottie mascot variants

## Backlog (not yet implemented)

- Windows + Linux Wayland regression pass
