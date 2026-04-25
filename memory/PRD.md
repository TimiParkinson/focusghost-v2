# FocusGhost — PRD

## Original problem statement

Build the FocusGhost desktop app strictly per the Trello board (`create-focusghost-trello.pdf`). Architecture is locked: Electron (main + renderer) + React + TypeScript + Vite, with IPC contract in `/src/shared/ipc.ts` and main-process modules + state machines exactly as described. Sprints must be completed in order (1 → 2 → 3 → 4). Each Trello card is a requirement; each checklist item is a step. GSAP integrated from Sprint 4 forward (per user override: install + use from start for mascot polish).

## Stack & architecture

- Electron Forge + Vite + React 18 + TypeScript + Tailwind CSS
- electron-store (local persistence), active-win (window polling)
- @google/generative-ai (Gemini 2.5 Flash, main-process only)
- GSAP (mascot float/blink + screen entrance), Zustand (renderer state), lucide-react (icons)
- IPC: contextBridge in `src/main/preload.ts`, channel constants + payload typings in `src/shared/ipc.ts`

## User personas

- **Solo focused worker** — declares a task, runs a 15–60 min session, gets gentle nudges when tab-hopping, ends with a one-line ghost insight.
- **Debugging dev stuck in a loop** — Stuck Mode triggers when cycling between ≤3 apps with low avg dwell; Gemini reframes + 3 next steps.
- **Hackathon demo** — `--demo` flag plays scripted switch sequence with auto nudge / auto stuck / auto end at 2/4/6 min marks.

## Core requirements (static, from Trello)

- 4 screens (Task Declaration, Active Session, Ghost Chat, Recap) + Settings + Collapsed always-on-top bar.
- Session FSM: IDLE ↔ ACTIVE ↔ DRIFTING ↔ INACTIVE → RECAP.
- Per-app time tracker with switch counter, focus / drift / inactive accounting.
- App categorization (FOCUS / RESEARCH / DISTRACTION / UNKNOWN) with overrides.
- Drift risk scorer (LOW/MEDIUM/HIGH), recomputed every 30s.
- Nudge engine with sensitivity presets (gentle / balanced / strict).
- Stuck mode detector — ≥6 switches among ≤3 apps in 4 min, avg dwell <90s, 10-min cooldown.
- Gemini-driven nudges, pattern notice every 15 min, ghost insight on session end, freeform chat (history capped 10 turns), structured stuck-mode response.
- Window controls — opacity slider (0.30–1.0), always-on-top, collapsed bar (~36px), frameless drag region.
- Three accent themes (teal / violet / amber), three ghost personalities.
- Demo mode with seed switch sequence.

## What's been implemented (2026-02-25)

### Sprint 1 — Core Engine ✅
### Sprint 2 — UI & Chat ✅
### Sprint 3 — Ghost AI ✅
### Sprint 4 — Polish ✅

### Backlog sprint (2026-02-26) ✅
- **Multi-session history view** — `screens/History.tsx` lists every saved session with focus / drift bar, expandable detail showing 4-stat grid + ghost insight + top apps. Clear-all action with confirm guard.
- **Cross-session focus streak tracking** — `src/main/streaks.ts` computes current + longest streak from saved sessions (qualifying threshold = 10 min focus per day) and a 30-day heatmap. New IPC channel `streak:get`.
- **Custom app category editor UI** — `screens/CategoryEditor.tsx` with search, "Add app" form for unknown apps, and per-app FOCUS / RESEARCH / DISTRACTION / UNKNOWN pills; CUSTOM badge marks overrides. Wired through new IPC channels `categories:get|set|knownApps`.
- **Cross-platform builds** — `forge.config.ts` extended with `MakerDMG` (macOS), `MakerZIP` for darwin+linux, `MakerSquirrel` (Windows), `MakerDeb` + `MakerRpm` (Linux). New scripts `make:mac`, `make:win`, `make:linux`. README documents Wayland fallback to manual mode.
- `package.json` with Electron Forge + Vite + React + TS + Tailwind (Trello requires `npm init electron-app@latest` — used same template deps).
- `src/shared/ipc.ts` — channel constants + typed `InvokeMap` and `EventMap` + `FocusGhostAPI` bridge contract.
- `src/main/preload.ts` — contextBridge exposes `window.api` to renderer.
- `src/main/windowTracker.ts` — active-win polling (1500 ms) with manual-mode fallback for demo / unsupported OS.
- `src/main/sessionMachine.ts` — typed FSM with guarded transitions + EventEmitter.
- `src/main/statsTracker.ts` — `AppTimeMap` + switch counter + live snapshot (uncommitted elapsed included).
- `src/main/inactivityTimer.ts` — 1 Hz check, configurable threshold from settings, emits inactive/resume.
- `src/main/persistence.ts` — electron-store schema (settings / sessions / appCategories) with helpers.
- `src/main/appCategories.ts` — pattern-based category lookup with overrides.
- `src/main/driftScorer.ts` — weighted (0.45 switches, 0.40 distraction%, 0.15 inactivity) score every 30 s.

### Sprint 2 — UI & Chat ✅
- `screens/TaskDeclaration.tsx` — task input + 4 duration pills + start button + Ghost mascot, Enter to start, GSAP entrance.
- `screens/ActiveSession.tsx` — task header + countdown timer, current app + FOCUS/DRIFT badge, switches/focus/drift stats, color-coded drift risk indicator, recent activity list, simulate-switch + end-session dev buttons.
- `screens/GhostChat.tsx` — scrollable message list, nudge variant with Accept/Dismiss, pattern variant, stuck overlay, freeform input + send, auto-scroll, busy indicator.
- `screens/Recap.tsx` — SESSION COMPLETE header + 4-stat grid + top apps with colored bars + Ghost Insight card + start-new-session CTA.
- `components/CollapsedBar.tsx` — 36px bar with ghost icon + truncated task + tabular timer + dot indicator + opacity cycle + expand.
- `components/Header.tsx` — drag region, tab nav, opacity cycle, collapse, settings.
- `components/Ghost.tsx` — pure SVG ghost with GSAP entrance + float + blink loop, color shifts to coral when drifting, amber when inactive.

### Sprint 3 — Ghost AI ✅
- `src/main/gemini.ts` — `promptGemini()` with system instruction, capped history (10 turns), 25 s timeout, deterministic offline fallback when no key configured.
- `src/main/prompts.ts` — system prompt parameterised by personality, switch-drift / inactivity / check-in / sprint-offer templates, pattern-notice, ghost-insight, structured stuck-mode template.
- `src/main/nudgeEngine.ts` — 60 s cooldown, switch-trigger / drift-threshold / 10-min focus check-in evaluation.
- `src/main/stuckDetector.ts` — debugging-loop detector (4 min window, ≤3 apps, avg dwell <90 s, 10 min cooldown).
- `screens/GhostChat.tsx` + `components/StuckCard.tsx` — Stuck Mode overlay with input → Gemini → structured "REFRAME / NEXT STEPS" card with "Yes / Still stuck" follow-up CTAs.

### Sprint 4 — Polish ✅
- `screens/Settings.tsx` — Appearance (accent picker / opacity slider / always-on-top), Nudges (preset + drift / switch / inactivity sliders with live override), Session defaults (duration / personality / demo toggle).
- Sensitivity preset bundles in `src/shared/presets.ts` (gentle 5min·8sw·90s, balanced 3min·5sw·60s, strict 1.5min·3sw·30s).
- Three accent themes wired via CSS custom properties on `body` class — live preview on change, persisted via electron-store.
- `src/main/demoMode.ts` — scripted switch sequence (Code → Twitter → YouTube → Code → Chrome → reddit ↔ Code) with auto-nudge at 2 min, auto-stuck at 4 min, auto-end at 6 min.
- GSAP — entrance animations on TaskDeclaration + Recap, mascot float + blink in `Ghost.tsx`.

### Cross-cutting
- `src/renderer/api.ts` — browser-mock `window.api` so renderer is previewable in plain Vite dev (verified via screenshot suite).
- TypeScript strict, ESLint clean, Vite renderer build passes.

## Backlog (P1)

- Windows + Linux Wayland regression test pass
- Pomodoro-style break suggestion after each completed session
- Calendar integration (block out focus sessions on Google Calendar)

## Stretch (P2)

- ElevenLabs voice nudges (settings toggles wired; SDK + voice integration pending)
- Lottie / CSS mascot animation variants beyond GSAP

## Next tasks

1. User installs `yarn install`, copies `.env.example → .env`, sets `GEMINI_API_KEY` from <https://aistudio.google.com/apikey>, runs `yarn start`.
2. macOS Accessibility permission grant for `active-win` on first launch.
3. Backlog items above, in P1 order.
