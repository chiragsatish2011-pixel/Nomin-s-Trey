# Status: Trey Apple-Style Design & Motion Parity

**Active Branch**: `feature/apple-design-and-motion`  
**Engineer**: Chirag S / The Nomin Company (`com.nomin.trey`)  
**Last Updated**: 2026-11-07  

---

## Progress Checklist

- [x] **Step 1: Reference Video Discovery & Analysis**
  - Discovered reference: `Can Claude build a cross-platform AI app - Riley Brown (1080p, h264).mp4` (63.8MB, 1080x1920 portrait, 30fps, 139.19s).
  - Saved to `reference/video/reference.mp4` (ignored in git).
  - Audio extracted to `reference/analysis/audio/reference_audio.wav`.
  - Transcribed with `faster-whisper 1.2.1` to `reference/analysis/transcript.txt` with exact timestamps.
  - Extracted 2fps overview frames (278 frames) and 30fps native segment frames (1440 frames across 4 segments).

- [x] **Step 2: Record Trey Before**
  - Implemented `TREY_ALLOW_SCREEN_RECORDING=1` development-only override in `apps/desktop/src/main/windows.ts`.
  - Built automated scenario script `scripts/record-trey-before.mjs`.
  - Recorded `reference/recordings/trey-before.mp4` (12.0s, 60fps, 1600x1000).

- [x] **Step 3: Motion Specification**
  - Documented complete mathematical specs in `docs/motion-spec.md` directly from Swift reference (`CursorOverlay.swift`, `ReportPanel.swift`, `LiveVoice.swift`).
  - Recorded exact formulas: launch easing, starburst, ripples, squish curve, and trip duration.

- [x] **Step 4: Apple Design System Specification**
  - Documented tokens in `docs/design-system.md` and created `apps/desktop/src/renderer/tokens.ts`.
  - Created automated regression test `packages/core/test/noEmoji.test.ts` (enforces 0 emoji violations).

- [x] **Step 5: Rebuild in Trey**
  - [x] Added vector icons in `apps/desktop/src/renderer/components/Icons.tsx` (Zap, Stop, Check, CheckCircle, Info, Alert, Minus, ChevronUp, ChevronDown, TreyMascot, FileText, ExternalLink, Lightbulb, Smartphone).
  - [x] Eliminated all emoji violations from `apps/desktop/src/` to pass `noEmoji.test.ts` (0 violations).
  - [x] Restyled Overlay Window (`apps/desktop/src/renderer/overlay/App.tsx`):
    - 72x72 teardrop cursor with 4pt white rim, radial gloss highlight, dual eyes with velocity tracking, arrival squish.
    - 650ms click ripple (`cubic-bezier(0.2, 0.7, 0.3, 1)`) and 550ms 6-particle starburst (`cubic-bezier(0.1, 0.8, 0.3, 1)`).
    - Speech bubble: gradient `#FFFFFF` to `#EEF0FF`, border `#6C86F5`, zero glow, downward tail.
    - Top-right research panel: 400x190 collapsed, 520x420 expanded, r=22px continuous, circular minus button, zero glow.
    - Apple pill HUD banner with vector icons, monospace step indicators, zero emojis, zero glow.
  - [x] Restyled Dashboard Window (`apps/desktop/src/renderer/dashboard/App.tsx`):
    - Inter / Segoe UI Variable typography, 76px countdown timer with tabular figures, zero emojis, Apple card tokens.

- [x] **Step 6: Record Trey After**
  - Built scenario script `scripts/record-trey-after.mjs`.
  - Encoded `reference/recordings/trey-after.mp4` at 60fps (12.0s, 1600x1000).

- [x] **Step 7: Verification & Parity Report**
  - Extracted 12 frame-by-frame before/after comparison screenshots into `reference/analysis/comparison/`.
  - Authored comprehensive quantitative report in `docs/parity-report.md`.

- [x] **Step 8: Final Cleanup & Validation**
  - `npm run typecheck`: Passed cleanly across all 4 workspaces (`core`, `protocol`, `desktop`, `mobile`).
  - `npm run lint`: Passed with 0 errors and 0 warnings.
  - `npm test`: Passed (81/81 tests passing across `core`, `protocol`, `mobile`).

---

## Decisions

1. **Font System**: Apple SF Pro / SF Symbols cannot be legally bundled on Windows; we use `Inter`, `"Segoe UI Variable"`, and `-apple-system` with Lucide MIT vector icons.
2. **Zero-Glow Mandate**: The reference explicitly removes all glows ("all glows are gone"); prior heavy box-shadow glows are replaced with crisp Apple-style borders (`1px rgba(255,255,255,0.08)` or `2.5px #6C86F5`) and subtle diffuse elevation shadows.
3. **Audio Synthesis**: Web Audio procedural pentatonic chime (`chirp.ts`) directly ports `LiveVoice.swift:576-618` ($C_5 \dots E_6$, 25ms upward scoop, 18Hz vibrato on last syllable, zero audio file dependencies).
4. **Research Panel**: Positioned top-right (`x: width - 24, y: 24`), 400x190 collapsed, 520x420 expanded, continuous 22px rounded rectangle, 26px circular action buttons.
5. **Screen Recording Flag**: `TREY_ALLOW_SCREEN_RECORDING=1` defaults to disabled in production, maintaining full window capture security protection.
