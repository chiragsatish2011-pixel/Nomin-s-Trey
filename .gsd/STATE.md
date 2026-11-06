# GSD Tracking Dashboard: Bluey for Windows (PC Edition)

**Goal:** Build a complete, robust, standalone Windows 10/11 desktop focus buddy ported from bluey-by-riley, powered by NVIDIA NIM vision models.
**Current Phase:** Phase 10 (Portability Gate & Verification) — ALL PHASES COMPLETED
**Health:** 🟢 GREEN (All 37 unit tests passing, zero lint errors, clean workspace build, zero platform imports in core)

---

### Execution Pipeline
- [x] **Phase A: Audit and Verify the Repo** (COMPLETED 2026-11-06)
  - Output: `docs/REPO_AUDIT.md`
  - Verification: Complete module map, exact math/algorithm reverse-engineering, prompt extraction, API mapping, open questions.
- [x] **Phase 0: Scaffold Monorepo** (COMPLETED 2026-11-06)
  - Output: `packages/core`, `apps/desktop`, npm workspaces, ESLint boundary rule, Vitest, basic Electron shell with 4 windows.
  - Verification: `npm test` passed in core, core lint rule catches electron imports, `typecheck` passed, build succeeded, Swift folders untouched.
- [x] **Phase 1: Face Widget & Googly Eyes** (COMPLETED 2026-11-06)
  - Output: Frameless transparent window (220x180), SVG/CSS blueberry body & crown, 60fps cursor polling with change detection, damped harmonic spring physics (`stiffness: 260`, `damping: 0.82`), expressions (`idle`, `listening`, `thinking`, `nudging`, `paused`, `sleeping`), tray debug menu, and persistent position storage.
  - Verification: Clean compilation, typed preload bridge, 60Hz cursor event dispatch with low idle CPU, spring motion integration.
- [x] **Phase 2: Session Engine, Tray, Lifecycle** (COMPLETED 2026-11-06)
  - Output: `SessionEngine` pure state machine (idle, running, paused, ended), focus clock with 4x developer mode, tick loop in `FocusCoordinator`, global `CommandOrControl+Alt+S` hotkey pause, `powerMonitor` lock/suspend listeners (unlock never auto-resumes), large countdown in dashboard, and countdown badge near face widget.
  - Verification: 8 Vitest tests in plain Node matching Swift `FocusTests.swift` (developer 4x clock, clock clamping on expiry, speed switching preserving both clocks), typecheck passed, lint clean.
- [x] **Phase 3: Perception Subsystem** (COMPLETED 2026-11-06)
  - Output: Defined `ScreenCapture`, `Ocr`, `ForegroundApp`, and `IdleMonitor` ports in `packages/core/src/ports` with Linux/Android stubs and coordinate transformation math (`CoordinateMath`). Windows implementations in `apps/desktop/src/main/platform/windows` using `desktopCapturer` (in-memory JPEG ~70 downscaled to max 1024px), `tesseract.js` OCR with line/word bounding boxes (`L1`, `W1`), Win32 PowerShell foreground app detection, and `powerMonitor.getSystemIdleTime()`. Perception Debug panel integrated into dashboard.
  - Verification: 12 Vitest tests passing including multi-DPI/display coordinate math unit tests, typecheck passed, lint clean.
- [x] **Phase 4: Nudge Policy (Pure TypeScript)** (COMPLETED 2026-11-06)
  - Output: `NudgePolicy` pure TypeScript implementation in `packages/core/src/policy/NudgePolicy.ts` with exact linear evidence span formula (120s-240s normal, 40s-80s developer mode), 120 focus-second cooldown, staleness gating, monotonicity checks, and gap resets.
  - Verification: 18 Vitest unit tests in plain Node matching all Swift `FocusTests.swift` scenarios (0.65 -> 200s, 0.50 -> 240s, developer mode 4x acceleration and cooldown, confidence neutrality), typecheck passed, lint clean.
- [x] **Phase 5: NVIDIA NIM Client, Governor & Classifier** (COMPLETED 2026-11-06)
  - Output: `NimGovernor` rate limiter (30 RPM sliding 60s window, priority queue: voice > nudge > classification > model_refresh, 429 cooldown dropping queued classification jobs, circuit breaker), `NimClient` OpenAI-compatible chat client with fallback model chain, `Classifier` with defensive Zod parsing, `NudgeWriter` (8-second timeout, gentle British personality), and `WindowsSecretStore` with Electron `safeStorage` (Windows DPAPI).
  - Verification: 28 Vitest unit tests in plain Node (priority queuing, 429 cooldown, circuit breaker, usage counters, Zod parser), typecheck passed, lint clean.
- [x] **Phase 6: Nudge Delivery & Overlay** (COMPLETED 2026-11-06)
  - Output: `NudgeWriter` gentle wording with 8-second timeout, click-through transparent overlay window (`setIgnoreMouseEvents`), WebAudio mathematical pentatonic chirp synthesis without asset files, cubic bezier flying blue pointer cursor (`TimingCurve.launch`), and target re-verification matching app PID and local OCR text.
  - Verification: Clean compilation, WebAudio synthesis math, target tolerance coordinate math, build and tests passing.
- [x] **Phase 7: Voice Subsystem (Local Speech Recognition & Task Parser)** (COMPLETED 2026-11-06)
  - Output: PushToTalk port, uiohook-napi global key hook (`Ctrl+Alt+1`) with fallback mode, sandboxed in-memory mic window, task parser regex + fallback extraction, voice commands (`pause`, `resume`, `end`, `time_left`).
  - Verification: Clean compilation, TypeScript strictly typed, 4 parser unit tests passing, zero memory/disk audio persistence.
- [x] **Phase 8: History, Timeline & Dashboard UI** (COMPLETED 2026-11-06)
  - Output: `%APPDATA%/Bluey/history.json`, rectangular timeline bar (green/peach/grey) with interactive check inspection, real active elapsed calculation, Developer Mode session tagging, and 3-tab Dashboard (`Focus`, `History`, `Settings`).
  - Verification: Clean compilation, history store tests passing, zero screenshot/OCR disk storage, settings dynamic update.
- [x] **Phase 9: Package & Harden** (COMPLETED 2026-11-06)
  - Output: electron-builder NSIS installer config, auto-start on login, tray-only mode, crash-safe session flusher, `USER_GUIDE.md`, `SECURITY_NOTES.md`.
  - Verification: Clean build, packaging scripts, DPAPI encrypted storage, contextIsolation verified on all 4 windows.
- [x] **Phase 10: Portability Gate** (COMPLETED 2026-11-06)
  - Output: Pure Node verification of `packages/core`, Linux/Android capability stubs for every port throwing `NotImplementedError`, `docs/PORTING.md`.
  - Verification: Zero platform imports in core, all 37 core unit tests pass in plain Node, Swift reference code untouched.
