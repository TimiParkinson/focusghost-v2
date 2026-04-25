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
├── shared/          # IPC contract + cross-process types + sensitivity presets
│   ├── ipc.ts
│   ├── types.ts
│   └── presets.ts
├── main/            # Electron main process
│   ├── main.ts             # entry — wires modules + IPC handlers
│   ├── preload.ts          # contextBridge exposes window.api
│   ├── windowTracker.ts    # active-win polling loop (1500ms)
│   ├── sessionMachine.ts   # FSM: IDLE ↔ ACTIVE ↔ DRIFTING ↔ INACTIVE ↔ RECAP
│   ├── statsTracker.ts     # per-app time + switch counter
│   ├── inactivityTimer.ts
│   ├── driftScorer.ts      # LOW / MEDIUM / HIGH risk
│   ├── stuckDetector.ts    # debugging-loop detection
│   ├── nudgeEngine.ts      # cooldown-aware nudge trigger
│   ├── gemini.ts           # Gemini SDK wrapper + offline fallback
│   ├── prompts.ts          # all prompt templates
│   ├── persistence.ts      # electron-store schema
│   ├── appCategories.ts    # FOCUS / RESEARCH / DISTRACTION patterns
│   └── demoMode.ts         # scripted switch sequence for demos
└── renderer/        # React UI
    ├── App.svelte
    ├── main.ts             # Svelte 5 mount entry
    ├── stores.ts           # writable stores (screen, session, chat, settings…)
    ├── api.ts              # window.api wrapper + browser-mock fallback
    ├── components/         # Ghost.svelte, ChatMessage.svelte, StuckCard.svelte, CollapsedBar.svelte, Header.svelte
    └── screens/            # TaskDeclaration.svelte, ActiveSession.svelte, GhostChat.svelte, Recap.svelte, Settings.svelte, History.svelte, CategoryEditor.svelte
```

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
