# Motion Design & Animation Specification

**Project:** Trey for Windows (PC Edition) — Autonomous Desktop Focus Companion  
**Application ID:** `com.nomin.trey`  
**Author:** Chirag S / The Nomin Company  
**Copyright:** Copyright (c) 2026 Nomin / Chirag S  
**Date:** November 2026  
**Document Status:** Complete Phase 3 Motion Analysis & Reverse-Engineered Specification  

---

## 1. Reference Video & Analysis Provenance

- **Source File:** `Can Claude build a cross-platform AI app - Riley Brown (1080p, h264).mp4` (SHA-256 verified)
- **Container Format:** MPEG-4 QuickTime (ISO Base Media), 1080×1920 (9:16 portrait vertical display recording)
- **Frame Rate:** $30.00\text{ fps}$ progressive ($33.333\text{ ms}$ per native frame)
- **Audio Stream:** AAC stereo, $44100\text{ Hz}$, $127.7\text{ kbps}$ bitrate
- **Total Duration:** $139.19\text{ seconds}$ ($4,175\text{ frames}$)
- **Transcription Engine:** `faster-whisper 1.2.1` (`base` model, int8 quantization, beam size 5)
- **Full Transcript Location:** [`reference/analysis/transcript.txt`](file:///C:/Users/chira/OneDrive/Desktop/bluey-by-riley/reference/analysis/transcript.txt)

---

## 2. Audio & Sound FX Reverse Engineering

Riley Brown notes in the reference video:
> *"C major pentatonic, two octaves up high (C6…E7), so it always sounds sweet together."*

### Synthesized Chirp Specification
- **Scale:** $C_5 \rightarrow E_6$ pentatonic ($[523.25, 587.35, 659.25, 784.0, 880.0, 1046.5, 1174.65, 1318.5]\text{ Hz}$)
- **Syllable Count:** 2 to 4 syllables per phrase
- **Syllable Durations:**
  - Standard syllable: $70\text{ ms} - 90\text{ ms}$
  - Final syllable: $130\text{ ms}$
  - Syllable gap: $28\text{ ms}$ silence
- **Mathematical Modulation:**
  $$\text{scoop}(t) = 1 - 0.18 \times e^{-t / 0.012}$$
  $$\text{wobble}(t) = 1 + 0.012 \times \sin(2\pi \times 18 \times t)$$
  $$\text{attack}(t) = \min(1, t / 0.006)$$
  $$\text{envelope}(t) = \text{attack}(t) \times e^{-3.2 t} \times (1 - t^6)$$
  $$\text{wave}(t) = \sin(\phi) + 0.12 \times \sin(2\phi)$$
- **Output Gain:** $0.26$ peak amplitude (anti-clipping peak limiter)

---

## 3. Cursor Anatomy & Flight Kinematics

### Teardrop Pointer Anatomy
- **Base Dimensions:** $72\text{px} \times 72\text{px}$ (scaling factor $k = \text{size} / 96 = 0.75$)
- **Tip Radius:** $r_{\text{tip}} = 6 \times k = 4.5\text{px}$ (sharp apex at origin $(0, 0)$)
- **Base Corner Radii:** $36\text{px}$ on remaining 3 corners (symmetric squircle teardrop)
- **Exterior Rim:** $8 \times k = 6\text{px}$ pure white (`#FFFFFF`) stroke (clipped to inner $3-4\text{px}$ visible border)
- **Body Gradient:** Linear gradient along vector $(0.25s, 0.067s) \rightarrow (0.75s, 0.933s)$:
  - Stop 0%: `#A9BCFF` (Soft Periwinkle)
  - Stop 34%: `#6C86F5` (Electric Berry)
  - Stop 68%: `#4254D6` (Deep Berry)
  - Stop 100%: `#2B2F8F` (Midnight Indigo)
- **Specular Radial Shine:**
  - Center: $(0.3s, 0.24s)$, Radius: $0.38s$
  - Color Stop 0%: `rgba(255, 255, 255, 0.55)`
  - Color Stop 100%: `rgba(255, 255, 255, 0.00)`
- **Googly Eyes Sub-layer:**
  - Socket Diameter: $d = 18 \times k = 13.5\text{px}$ (White `#FFFFFF` ellipse)
  - Pupil Diameter: $p = 9 \times k = 6.75\text{px}$ (Dark Ink `#17151F`)
  - Socket Center Positions:
    - Left Eye: $x = 34 \times k = 25.5\text{px}, y = 40 \times k = 30.0\text{px}$
    - Right Eye: $x = (34 + 24) \times k = 43.5\text{px}, y = 40 \times k = 30.0\text{px}$
  - Rest Gaze Offset: $\text{look} = (-0.7, -0.7)$ (pupils looking down-left toward pointer tip)
  - Velocity-Coupled Gaze: When velocity $> 90\text{ px/s}$, pupils look along local trajectory vector with lag follow rate $\min(1, 12 \times \Delta t)$
  - Blink Animation: Eye socket scales vertically to $0.12 \times$ height for $130\text{ ms}$; random blink interval $2.5\text{s} - 6.0\text{s}$.

### Flight Kinematics & Trip Duration
- **Trip Duration Formula:**
  $$\text{duration}(D) = \min\left(1.2\text{s}, \max\left(0.45\text{s}, 0.4 + 0.12 \times \log_2\left(1 + \frac{D}{24}\right)\right)\right)$$
- **Trajectory Curvature (Bézier Arc):**
  - $\text{reach} = 0.3 \times D$
  - $\text{bow} = \min(0.1 \times D, 70) \times 0.75$
  - Control points $c_1$ and $c_2$ offset along trajectory normal vector:
    - Sideways flights bow gently upward ($\text{normal}_y < 0$)
    - Vertical flights bow toward the center of the display
- **Timing Easing Curves:**
  - **Launch:** $\text{cubic-bezier}(0.42, 0.00, 0.22, 1.00)$ (gentle acceleration, long soft arrival)
  - **Redirect:** $\text{cubic-bezier}(0.25, 0.25, 0.22, 1.00)$ (maintains initial velocity on in-flight target redirect)
  - **Drag / Steady:** $\text{cubic-bezier}(0.42, 0.00, 0.38, 1.00)$ (constant deliberate transit)
- **Lean Tilt:**
  $$\text{lean} = \max\left(-0.2\text{ rad}, \min\left(0.2\text{ rad}, \frac{v_x}{2800}\right)\right)$$
  - Angular Spring: $k = 24\text{ rad/s}^2$, critically damped ($d = 2\sqrt{k} \approx 9.798$)

---

## 4. Click Ripples & Particle Explosions

### Click Ring Ripple
- **Trigger:** When pointer tip settles at destination coordinates $(x, y)$.
- **Initial Radius:** $r_0 = 11.4\text{px}$ ($0.3 \times r_{\text{final}}$)
- **Final Radius:** $r_{\text{final}} = 38\text{px}$ (Left Click) / $44\text{px}$ (Right Click)
- **Stroke:** $3.5\text{px}$ solid `#6C86F5` (Left) / `#4254D6` (Right)
- **Duration:** $650\text{ ms}$
- **Easing:** $\text{cubic-bezier}(0.20, 0.70, 0.30, 1.00)$
- **Opacity Curve:** Starts at $0.85$, fades out linearly to $0.00$

### Radial Starburst Particles
- **Particle Count:** 6 discrete 8-point stars
- **Radial Distribution:** Angle $\theta_i = \frac{i}{6} \times 2\pi + \text{random}(-0.25, 0.25)\text{ rad}$
- **Travel Distance:** Random between $34\text{px}$ and $58\text{px}$
- **Particle Radius:** Random between $4\text{px}$ and $7\text{px}$
- **Duration:** $550\text{ ms}$
- **Motion Easing:** $\text{cubic-bezier}(0.10, 0.80, 0.30, 1.00)$
- **Keyframe Opacity:** $[0\% \rightarrow 1.0, 45\% \rightarrow 1.0, 100\% \rightarrow 0.0]$
- **Spin Rotation:** Random rotation $\pm 2.5\text{ rad}$
- **Scale Shrink:** $1.0 \rightarrow 0.4$

### Arrival Press & Squish
- **Squish Scale Curve:**
  - $t \in [0, 120\text{ms}]$: $\text{scale} = 1 - 0.14 \times \sin\left(\frac{t}{0.12} \times \frac{\pi}{2}\right)$
  - $t \in [120\text{ms}, 420\text{ms}]$ ($r = \frac{t - 0.12}{0.30}$): $\text{scale} = 1 - 0.14 \times \cos(1.5\pi r) \times e^{-3.2 r}$

---

## 5. Speech Bubble & Research Report Panel

### Speech Bubble (Dialogue Cloud)
- **Placement:** Over destination element or anchored directly above the cursor pointer.
- **Background Fill:** Linear gradient from top to bottom: `#FFFFFF` $\rightarrow$ `#EEF0FF`
- **Border Stroke:** $2.5\text{px}$ solid `#6C86F5` (line join `.round`)
- **Corner Radius:** $14\text{px} - 16\text{px}$ continuous squircle
- **Pointer Tail:** Triangular apex ($w = 14\text{px}, h = 10\text{px}$) pointing down at target
- **Shadow & Glow:** **ZERO GLOW** (pure crisp boundary, subtle ambient drop shadow `0 8px 24px rgba(0,0,0,0.18)`)
- **Typography:** Inter / IBM Plex Sans $13\text{px}$ SemiBold in `#17151F` (Dark Ink)

### Research Report Panel
- **Placement:** Top-right corner of primary screen: $x = \text{width} - W - 24\text{px}, y = 24\text{px}$
- **Dimensions:**
  - Collapsed Preview: $400\text{px} \times 190\text{px}$
  - Loading State: $400\text{px} \times 140\text{px}$
  - Expanded State: $520\text{px} \times \min(H \times 0.75, 480\text{px})$
- **Corner Radius:** $22\text{px}$ continuous
- **Fill:** Linear gradient top-to-bottom: `#FFFFFF` $\rightarrow$ `#EEF0FF`
- **Border:** $2.5\text{px}$ solid `#6C86F5`
- **Header Elements:**
  - Magnifying Glass Icon: $15\text{px}$ bold `#6C86F5`
  - Title: $20\text{px}$ Bold `#17151F`
  - Minus Button: $26\text{px} \times 26\text{px}$ circular pill `#6C86F5` with white heavy minus icon
- **Body Elements:**
  - Collapsed: 3 lines maximum ($14\text{px}$ `#17151F`), followed by `"Click to read more"` ($11\text{px}$ `#6C86F5`)
  - Expanded: Full paragraphs ($15\text{px}$ `#17151F`), `"SOURCES"` header ($11\text{px}$ `#5D5873`), link pills ($13\text{px}$ `#6C86F5`)

---

## 6. Motion Specification Master Table

| Element | Trigger / Event | Start State | End State | Duration | Easing / Spring Parameters | Source Evidence | Implementation Equivalent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cursor Travel** | Model action dispatched | Current screen position | Target $(x, y)$ | $450 - 1200\text{ ms}$ (formula) | $\text{cubic-bezier}(0.42, 0, 0.22, 1)$ | `CursorOverlay.swift:254`, Video $0:47$ | CSS / Framer Motion `transition` |
| **Cursor In-Flight Lean** | Pointer velocity $> 60\text{ px/s}$ | $\theta = 0\text{ rad}$ | $\theta = \pm 0.2\text{ rad}$ | Continuous | Spring $k=24, d=9.8$ | `CursorOverlay.swift:227` | RequestAnimationFrame transform |
| **Arrival Squish** | Landing on target | $\text{scale} = 1.0$ | $\text{scale} = 0.86$ | $420\text{ ms}$ | Damped rebound $e^{-3.2r}\cos(1.5\pi r)$ | `CursorOverlay.swift:319` | Keyframe scale animation |
| **Click Ring Ripple** | Physical click fires | $r = 11.4\text{px}, \alpha = 0.85$ | $r = 38\text{px}, \alpha = 0$ | $650\text{ ms}$ | $\text{cubic-bezier}(0.2, 0.7, 0.3, 1)$ | `CursorOverlay.swift:766`, Video $1:10$ | CSS `@keyframes ringExpand` |
| **Click Starburst** | Physical click fires | 6 stars at $(0, 0)$ | $d \in [34, 58]\text{px}$ | $550\text{ ms}$ | $\text{cubic-bezier}(0.1, 0.8, 0.3, 1)$ | `CursorOverlay.swift:768` | CSS `@keyframes starBurst` |
| **Speech Bubble In** | Agent status/reply emitted | $\text{scale}=0.8, \alpha=0$ | $\text{scale}=1.0, \alpha=1$ | $320\text{ ms}$ | Spring $k=260, d=0.82$ | `CursorOverlay.swift:515`, Video $1:12$ | CSS spring transition |
| **Report Card Expand** | User clicks preview card | $W=400, H=190$ | $W=520, H=420$ | $380\text{ ms}$ | Spring $k=220, d=0.85$ | `ReportPanel.swift:78`, Video $0:49$ | CSS width/height transition |
| **Mascot Gaze Track** | Cursor or mouse moves | Current gaze $(x, y)$ | Target unit gaze | Continuous | Spring $k=260, d=0.82$ | `FaceView.swift:51` | Canvas 60fps spring solver |
| **Mascot Blink** | Timer ($2.5 - 6\text{s}$) | Eyes open | Sockets $0.12\times$ | $130\text{ ms}$ | Linear keyframe | `FaceView.swift:65` | Canvas vertical scale pulse |
| **Chirp Sound FX** | Mode change / Step start | Silence | Pentatonic arpeggio | $280 - 450\text{ ms}$ | Web Audio synthesis | `LiveVoice.swift:188` | Web Audio API Oscillator |

---

## 7. Discrepancies & Platform-Specific Notes

1. **Window Background Blur**:
   - macOS uses native `NSVisualEffectView` with vibrancy.
   - On Windows 10/11, Electron transparent windows do not blur the desktop behind them using CSS `backdrop-filter`.
   - **Resolution:** We enable Windows 11 `backgroundMaterial: 'acrylic'` on the dashboard and face windows, and use calibrated translucent linear gradients (`rgba(18, 16, 28, 0.94)`) for the overlay HUD to ensure $100\%$ contrast and legibility over any wallpaper.
2. **Apple Font Licensing Restrictions**:
   - Apple strictly restricts SF Pro and SF Symbols to Apple hardware.
   - **Resolution:** Replaced with Inter (SIL Open Font License) and Lucide icon vectors (MIT License), maintaining identical optical weight and geometry without licensing infractions.
