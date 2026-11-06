# Trey for Windows (PC Edition) — User Guide

Welcome to **Trey for Windows**, your desktop focus companion ported from the original Mac reference. Trey is a blueberry character that sits gently on your desktop, follows your mouse pointer with lively spring-animated googly eyes, periodically checks your screen against your declared mission using NVIDIA NIM vision AI, and nudges you back on track when you drift into distractions.

---

## 1. System Requirements & Setup

- **Operating System:** Windows 10 or Windows 11 (64-bit).
- **AI Backend:** NVIDIA NIM API Key (obtain from [build.nvidia.com](https://build.nvidia.com)).
- **Permissions:**
  - Screen capture (Windows Desktop Duplication / capturer API).
  - Microphone access (for optional Push-to-Talk voice commands).
  - Global hotkeys (`Ctrl+2` for emergency pause, `Ctrl+1` for push-to-talk).

### First-Time Configuration
1. Launch **Trey**.
2. Trey appears on your desktop, and a blueberry icon sits in your Windows System Tray (notification area).
3. Open the **Dashboard** (double-click the tray icon or choose **Open Dashboard** from the tray menu).
4. Navigate to the **⚙️ Settings** tab.
5. Paste your NVIDIA NIM API key into the input field and click **Save Key**.
   - Your key is immediately encrypted using Windows DPAPI (`CryptProtectData` via Electron `safeStorage`). It is never stored in plain text and never exposed to the web renderers.

---

## 2. Starting a Focus Session

### Option A: The Dashboard UI
1. In the **🎯 Focus** tab of the Dashboard, enter what you plan to work on (e.g. `Implement unit tests for compiler`).
2. Adjust the duration slider (between 1 and 240 minutes; default is 30 minutes).
3. *(Optional)* Toggle **Developer Mode (4×)** if you want accelerated 10-second checks and a 4x fast clock.
4. Click **Start Focus Session**.

### Option B: Push-to-Talk Voice
1. Press and hold **`Ctrl + 1`** anywhere in Windows.
2. Trey's face will change to the **listening** expression.
3. Speak naturally, e.g.:
   - *"I'm writing the documentation for 45 minutes"*
   - *"Focus on fixing the login bug for 20 mins"*
4. Release the keys. Trey transcribes your speech locally in memory, parses the task and duration, starts your session, and displays a cheerful confirmation bubble on your screen.

---

## 3. During Focus

- **Googly Eyes:** Trey's pupils track your mouse across your displays using damped spring physics.
- **Always-on-Top:** Trey stays on top of your normal applications so you always have a gentle visual anchor. Drag the blueberry by its body to reposition it anywhere on your desktop; position is remembered across restarts.
- **Observation Checks:** Every ~30 seconds (10s in Developer Mode), Trey takes an in-memory snapshot of your screen, runs OCR, and consults NVIDIA NIM:
  - If you are on-task: Trey stays quiet and content.
  - If you drift off-task (e.g. social media feeds, unrelated browsing): Trey accumulates evidence over a calibrated span (120s–240s) before nudging, ensuring brief glances or quick interruptions don't trigger false alerts.
- **The Nudge:** When an off-task distraction is verified, Trey plays a synthesized pentatonic chirp, renders a gentle speech bubble near the face widget, and animates a blue pointing cursor to the distracting element if still present.

---

## 4. Hotkeys & Controls

| Action | Shortcut / Trigger | Description |
| :--- | :--- | :--- |
| **Emergency Pause** | `Ctrl + 2` | Immediately pauses session. Useful before screen-sharing or entering passwords. |
| **Push-to-Talk** | `Ctrl + 1` (Hold) | Hold to speak your task or voice commands (*"pause"*, *"resume"*, *"end"*, *"time left"*). |
| **PC Lock / Sleep** | Win + L / Suspend | Automatically pauses session. Unlocking never resumes automatically. |
| **Resume Focus** | Dashboard or Tray | Resumes session timer and resets nudge evidence. |
| **End Focus** | Dashboard or Tray | Concludes session early and saves metrics to history. |

---

## 5. Timeline & History

Navigate to the **📊 History** tab in the Dashboard:
- Every finished session is logged to `%APPDATA%/Bluey/history.json`.
- Sessions show planned duration and **real active elapsed time**. Developer Mode sessions are clearly labeled.
- **Interactive Timeline Bar:**
  - 🟢 **Green:** On task
  - 🍑 **Peach:** Off task
  - ⚪ **Grey:** Unknown / Unchecked / NIM Cooldown
  - 🔴 **Red Dot:** Nudge delivered
- **Inspect Checks:** Click any segment of the timeline to see exact $P(\text{off-task})$, $P(\text{on-task})$, confidence scores, and timestamps.
- **Strict Privacy Guarantee:** Screenshots and OCR text are **NEVER** stored in history. Only timestamped probabilities and metadata are saved.

---

## 6. Tray Menu

Right-click the Trey blueberry icon in the Windows taskbar tray to access:
- **Focus Status:** Current state, task name, and elapsed clock.
- **Pause / Resume / End Focus:** Quick session lifecycle controls.
- **Open Dashboard:** Bring up the main Dashboard window.
- **Toggle Face Widget:** Hide or show the floating blueberry character.
- **Developer Mode (4x Clock):** Toggle accelerated clock mode on the fly.
- **Expression (Debug):** Manually test all 6 facial expressions (`idle`, `listening`, `thinking`, `nudging`, `paused`, `sleeping`).
- **Test a Nudge:** Trigger an instant speech bubble and chirp notification without waiting for perception.
- **Quit Trey:** Cleanly shuts down the app and flushes active session metrics to disk.
