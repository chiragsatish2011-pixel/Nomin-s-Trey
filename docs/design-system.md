# Trey Apple-Style Design System Specification

**Project:** Trey for Windows (PC Edition) — Autonomous Desktop Focus Companion  
**Application ID:** `com.nomin.trey`  
**Author:** Chirag S / The Nomin Company  
**Copyright:** Copyright (c) 2026 Nomin / Chirag S  
**Date:** November 2026  
**Document Status:** Complete Phase 4 Design System Specification  

---

## 1. Principles & Zero-Emoji Mandate

### Core Principles
1. **Calm, Minimal, Restrained:** Interfaces do not shout. Motion and color serve orientation and understanding, never decoration.
2. **Direct Manipulation:** Feedback lives on pointer-down ($100\text{ms}$ active scale `scale(0.97)`), not on release. Tracking follows $1:1$.
3. **Interruptibility:** Every animation can be grabbed, reversed, or redirected mid-flight without locking input.
4. **Behavior over Scripting:** Springs instead of fixed durations for interactive elements. Damping ratio $1.0$ (critically damped) by default; $0.8$ for momentum-driven releases.
5. **Universal Legibility:** Every text label adheres strictly to WCAG AA minimum contrast ratio of $4.5:1$ over any wallpaper or material.

### Zero-Emoji Mandate & Vector Replacement
- **Rule:** Emojis (Unicode ranges `\u{1F300}-\u{1F9FF}`, `\u{2600}-\u{26FF}`, `\u{2700}-\u{27BF}`, blueberry emoji `🫐`, checkmarks `✓`, etc.) are **strictly banned** across all application source code, UI strings, trays, installers, and test files.
- **Replacement:** All glyphs are replaced with clean, open-licensed SVG vector icons (Lucide Icons, MIT License) or mathematically drawn companion expressions.
- **Enforcement:** Enforced via automated Vitest suite (`test/noEmoji.test.ts`) that traverses `apps/desktop/src/` and fails if any emoji character or shortcode is detected.

---

## 2. Design Tokens (`designTokens.ts`)

### Color Tokens (Semantic & Contrast Verified)
```typescript
export const tokens = {
  colors: {
    // Primary Brand / Accent Palette (Derived from Blueberry Reference)
    accent: {
      subtle: '#A9BCFF',       // Periwinkle badge backgrounds, focus rings
      primary: '#6C86F5',      // Core brand blue, primary CTA, cursor body
      hover: '#5A75EA',        // Hover state
      active: '#4254D6',       // Active press state
      deep: '#2B2F8F',         // Gradient anchor
    },
    // Surface & Material Backgrounds
    surface: {
      canvas: '#0E1017',       // Main window background
      card: '#161926',         // Card background
      cardElevated: '#1C2033', // Raised surfaces, modals, popovers
      bubble: '#FFFFFF',       // Speech bubble top fill
      bubbleTint: '#EEF0FF',   // Speech bubble bottom gradient
      overlayBanner: 'rgba(18, 16, 28, 0.94)', // HUD banner background
    },
    // Borders & Dividers
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.16)',
      accent: '#6C86F5',
      accentSubtle: 'rgba(108, 134, 245, 0.35)',
    },
    // Typography Colors (WCAG AA Compliant)
    text: {
      primary: '#FFFFFF',       // Contrast > 12:1 against dark surfaces
      secondary: '#9499AD',     // Contrast > 5.5:1
      tertiary: '#636A80',      // Muted metadata
      inverse: '#17151F',       // Used on white/light bubble cards (Contrast > 14:1)
      inverseSubtle: '#5D5873', // Secondary text on light cards
    },
    // Status & Feedback
    status: {
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      dangerGlow: 'rgba(239, 68, 68, 0.45)',
    }
  },

  // 4px Spacing Grid
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },

  // Concentric Radii System: R_inner = R_outer - Padding
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    bubble: '16px',
    card: '22px',
    pill: '999px',
  },

  // Elevation & Ambient Lighting (No harsh glows)
  shadows: {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.25)',
    card: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    overlay: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(108, 134, 245, 0.35)',
    stopButton: '0 4px 16px rgba(239, 68, 68, 0.4)',
  },

  // Typography Scale (Inter / Segoe UI Variable, 100% License Safe)
  font: {
    family: 'Inter, "Segoe UI Variable", -apple-system, BlinkMacSystemFont, sans-serif',
    familyMono: '"IBM Plex Mono", "SF Mono", Consolas, monospace',
    size: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      timer: '76px', // Precision countdown display
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },

  // Motion Curves & Spring Parameters
  motion: {
    spring: {
      gaze: { stiffness: 260, damping: 0.82 },
      cursorLean: { stiffness: 24, damping: 1.0 },
      cardExpand: { stiffness: 220, damping: 0.85 },
      speechBubble: { stiffness: 260, damping: 0.82 },
    },
    timing: {
      launch: 'cubic-bezier(0.42, 0, 0.22, 1)',
      redirect: 'cubic-bezier(0.25, 0.25, 0.22, 1)',
      ripple: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      starburst: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
      fade: 'ease-out 150ms',
    }
  }
}
```

---

## 3. Materials & Transparency on Windows 11

In Electron on Windows:
- A transparent BrowserWindow with CSS `backdrop-filter: blur(...)` does not blur the desktop background underneath.
- Windows 11 supports native window backdrop composition through Electron's `BrowserWindow.backgroundMaterial`:
  - `backgroundMaterial: 'acrylic'` on Windows 11 (build $\ge 22000$).
  - Graceful fallback: High-density translucent composite `#0E1017` ($94\%$ opacity) on Windows 10 and non-composited sessions.
- In both modes, text contrast is strictly maintained using high-luminance white (`#FFFFFF`) against elevated `#161926` cards.

---

## 4. Component Redesign Specifications

### 1. The Teardrop Pointer Cursor
- Drawn mathematically without bitmaps:
  - $72\text{px} \times 72\text{px}$ SVG teardrop path (`M 12 8 C 8 26, 18 48, 32 58...`).
  - $4\text{pt}$ crisp white stroke.
  - Linear gradient (`#A9BCFF` to `#2B2F8F`) + radial shine highlight.
  - Two vector googly eye sockets with velocity-directed pupils.

### 2. Speech Bubble (Replacing Nudges & Prompts)
- Continuous squircle card with downward triangular tail pointing to the cursor tip.
- Gradient fill: `#FFFFFF` to `#EEF0FF`.
- Border: $2.5\text{px}$ `#6C86F5`.
- Text: $13\text{px}$ SemiBold in `#17151F` (Dark Ink). Zero emojis.

### 3. Research & Explanation Card
- Placed in top-right corner ($x = \text{maxX} - 424\text{px}, y = 24\text{px}$).
- Collapsed preview mode: $400\text{px} \times 190\text{px}$.
- Expanded inspection mode: $520\text{px} \times 420\text{px}$.
- Circular $26\text{px}$ minus button (`#6C86F5`) for dismiss/collapse.

### 4. Focus Dashboard
- 76px SF Pro/Inter monotonic timer centered cleanly in the hero region.
- Single unified task input field with Apple-style focus outline (`#6C86F5`).
- "Take Control (PC Takeover)" trigger button styled with subtle gradient and active press feedback.
- Clean vector icons for all controls (Play, Pause, Stop, Settings, Chevron).

### 5. Floating Companion Face
- Smooth Canvas rendering with Riley Brown spring equations ($k=260, d=0.82$).
- Zero bitmap emojis; expressions represented through procedural eye, brow, pupil, and mouth vectors.
