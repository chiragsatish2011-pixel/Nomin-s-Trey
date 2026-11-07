# Trey Mobile Companion — Visual & Interaction Design Specification

**Document ID:** `DESIGN-SPEC-TREY-MOBILE-2026`  
**Product:** Trey by Chirag S / The Nomin Company  
**Author:** Chirag S / The Nomin Company  
**Copyright:** Copyright (c) 2026 Nomin / Chirag S  
**Date:** November 2026  
**Status:** Approved Phase 2 Design Contract  

---

## 1. Design Principles & Foundational Philosophy

1. **Unmistakable Presence:** Trey is a physical, living creature on the screen, not an abstract avatar or robotic bot. Gaze follows touch, breathing is subtle, and reactions have physical spring weight.
2. **Safety by Default:** Emergency abort is always front-and-center. The prominent red `STOP` button is accessible in $<100\text{ms}$ with zero nested menus or gesture ambiguity.
3. **Glanceable Connection State:** A clear status pill at the header indicates whether the phone is streaming live from the desktop, running standalone, or disconnected.
4. **Touch & Accessibility First:** Minimum touch targets are $48 \times 48\text{dp}$. All controls have explicit ARIA labels and high-contrast color ratios exceeding WCAG AAA standards.

---

## 2. Color Palette & Theming Tokens

### Dark Theme (Default)
Trey's signature deep berry night palette:
- **Background Primary:** `#0A0D14` (Deep space blueberry)
- **Surface / Card Background:** `#121826` (Translucent navy-berry card)
- **Surface Elevate / Border:** `rgba(255, 255, 255, 0.08)` (Crisp 1px glass rim)
- **Text Primary:** `#F8FAFC` (Clean optical white)
- **Text Secondary:** `#94A3B8` (Slate subdued)
- **Accent Primary (Berry Glow):** `#6C86F5` (Vibrant berry lavender)
- **Accent Secondary (Sky):** `#38BDF8`
- **Emergency STOP Red:**
  - Base: `#EF4444`
  - Active Press: `#DC2626`
  - Glow: `rgba(239, 68, 68, 0.45)`
- **Success / Connected Green:** `#10B981`
- **Warning / Stale Amber:** `#F59E0B`

### Light Theme
- **Background Primary:** `#F1F5F9` (Soft frosted cloud)
- **Surface / Card Background:** `#FFFFFF` (Pure white card)
- **Surface Border:** `rgba(0, 0, 0, 0.08)`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#64748B`
- **Accent Primary:** `#4F46E5`

---

## 3. Typography Scale

- **Display (Timer & Moods):** `Fredoka, -apple-system, sans-serif`, 36–44sp, 700 Bold, tracking `-0.02em`.
- **Title (Headers & Tasks):** `Inter, system-ui, sans-serif`, 18–20sp, 600 SemiBold.
- **Body / Step Logs:** `Inter, system-ui, sans-serif`, 14sp, 400 Regular, line-height $20\text{sp}$.
- **Monospace (Timeline & Keys):** `ui-monospace, SFMono-Regular, Menlo, monospace`, 12sp.

---

## 4. Spacing, Layout & Touch Targets

- **Base Unit:** 4px grid ($4, 8, 12, 16, 20, 24, 32\text{px}$).
- **Screen Margins:** 16px horizontal gutter, safe-area aware (`env(safe-area-inset-top)` / `bottom`).
- **Card Padding:** 16px to 20px.
- **Primary STOP Button:**
  - Height: **64dp**
  - Width: Full width minus 32px padding ($100\%$)
  - Corner Radius: 20dp
  - Elevation: 8dp drop shadow with red ambient glow
  - Label: `STOP (Emergency Abort)` with bold stop symbol `🛑`
- **Secondary Buttons / Icons:** Minimum $48 \times 48\text{dp}$ touch target area.

---

## 5. Screen Hierarchy & Views

### View 1: Companion Stage (Mode A)
1. **Header Bar:**
   - Left: Mode switcher pill (`Companion Mode` vs `Standalone Mode`).
   - Center: Connection status dot (`Connected` / `Stale >5s` / `Disconnected`).
   - Right: Settings gear icon.
2. **Character Arena (Top 45% of viewport):**
   - High-performance HTML5 Canvas rendering `TreyCharacter.tsx`.
   - Character peeks up from card bottom with harmonic spring Euler integration.
   - Touch tracking: dragging finger across screen smoothly pulls Trey's gaze toward touch point.
3. **Session & Timeline Card (Middle 30% of viewport):**
   - Task label and duration.
   - Apple-style single-source-of-truth progress clock (elapsed / remaining).
   - Interactive step timeline (checks, thought bubbles, and active takeover step).
4. **Action Bar (Bottom 25% of viewport):**
   - Quick Voice Query (Microphone button with animated wave).
   - Text task input bar.
   - Full-width prominent red **STOP** button.

### View 2: Standalone Mode (Mode B)
1. **Header Bar:**
   - Active mode pill: `Standalone Assistant (On-Device + NIM)`.
   - NVIDIA NIM model badge (e.g. `llama-3.3-70b`).
2. **Character Stage:**
   - Full interactive Trey character.
   - Reacts to voice input (`listening`), thinking (`thinking`), speaking answers (`talking`).
3. **Assistant Card:**
   - Focus timer controls (Start 25m / 45m / Custom focus clock).
   - Conversational chat transcript.
   - Speech-to-text live transcription banner.
4. **Settings & Pairing Sheet:**
   - QR scanner launch button (`Pair with Desktop Trey`).
   - Enter personal NVIDIA NIM key (`nvapi-...`) with toggle visibility.
   - Revoke paired devices.

---

## 6. Interaction States & Transitions

- **Touch & Gaze Interactivity:**
  - `onTouchMove` updates virtual gaze point $(x, y) \in [-1, 1]$.
  - Letting go smoothly restores gaze to mouse or random saccade wandering within 300ms.
- **Connection Loss Transition:**
  - At $t > 5.0\text{s}$ with no packets, connection pill pulses amber, timeline fades to 50% opacity.
  - Reconnection banner displays exponential backoff counter: `"Reconnecting in 2s..."`.
  - STOP button remains active and will attempt urgent direct socket reconnect to send packet.
- **Emergency STOP Action:**
  - Instantly plays low-frequency haptic vibration (`navigator.vibrate([100, 50, 100])`).
  - Sends unbuffered `stop` packet over encrypted link.
  - Switches character expression to `resting` with closed sleepy eyes.
