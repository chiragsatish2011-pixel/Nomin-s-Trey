# 🫐 Trey — Your Intelligent Focus Companion

> **Meet Trey:** A friendly, intelligent desktop focus buddy and mobile copilot that keeps you in the zone, follows your cursor with playful cartoon eyes, nudges you when you drift off-task, and lets you manage everything right from your Android phone.

**Created by:** Chirag S  
**Company:** [The Nomin Company](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey)  
**Copyright:** © 2026 Nomin / Chirag S  
**License:** Open Source · Inspired by Riley Brown's Bluey  

---

## ⚡ Quick Downloads

| Platform | Download | Requirements |
| :--- | :--- | :--- |
| **📱 Android App** | [**Download `.apk` (v0.2.2)**](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases/download/v0.2.2/trey-companion-v0.2.2-debug-signed.apk) | Android 8.0+ (Phones & Tablets) |
| **💻 Windows PC** | [**Download `.exe` Installer (v0.2.2)**](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases/download/v0.2.2/Trey-Setup-0.2.2.exe) | Windows 10 or 11 (64-bit) |
| **📦 All Releases** | [**GitHub Releases Hub**](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases) | Checksums & release archives |

---

## 📱 How to Install Trey on Your Android Phone

Installing Trey on Android is fast and takes less than a minute. Because Trey is distributed directly as an APK from GitHub, follow these simple steps:

### Step 1: Download the File
Open your mobile browser (like Chrome) and tap:  
👉 **[Download Trey for Android (`.apk`)](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases/download/v0.2.2/trey-companion-v0.2.2-debug-signed.apk)**

### Step 2: Allow Installation
When the download finishes, tap **Open** or find `trey-companion-v0.2.2-debug-signed.apk` in your **Downloads** folder.

> [!NOTE]  
> If Android says: *"For your security, your phone is not allowed to install unknown apps from this source"*:
> 1. Tap **Settings** on the prompt.
> 2. Switch **"Allow from this source"** to **ON**.
> 3. Press the **Back** button.

### Step 3: Tap Install & Enjoy!
1. Tap **Install** on the package installer dialog.
2. Tap **Open** when finished. Trey’s animated eyes will wake up immediately! 🎉

---

## 💻 How to Install Trey on Your Windows PC

1. Download **[Trey-Setup-0.2.2.exe](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases/download/v0.2.2/Trey-Setup-0.2.2.exe)**.
2. Double-click the installer. Follow the simple on-screen wizard.
3. Trey will launch right onto your desktop as a cute floating berry companion, complete with a system tray icon and a glass dashboard.

---

## 🔗 How to Pair Phone and PC in 10 Seconds

When both devices are on your home Wi-Fi network, pairing is instantaneous, end-to-end encrypted, and private:

```
┌────────────────────────┐                   ┌────────────────────────┐
│      Windows PC        │                   │     Android Phone      │
│  Trey Dashboard        │                   │  Trey Mobile App       │
│  [Pair Phone] button   │ ── QR Scan ─────> │  Tap Camera Icon       │
│  Shows 5-min secure QR │ <── HMAC Proof ── │  Instant Paired Sync!  │
└────────────────────────┘                   └────────────────────────┘
```

1. **On your PC:** Open the Trey Dashboard (click the Trey tray icon -> **Dashboard**). Click **"Pair Phone"** in the sidebar. A unique, single-use QR code will appear.
2. **On your phone:** Open the Trey app, tap the **Camera Icon** at the top right, and point your camera at the PC screen. *(If camera permissions are denied, you can paste the text code manually).*
3. **Connected!** Both devices instantly perform a mutual cryptographic handshake (HMAC-SHA256) and establish an encrypted session (AES-256-GCM). Trey's eyes on your phone will immediately mirror your PC!

---

## ✨ Immersive Full-Screen Mobile Experience (Inspired by Bluey)

The mobile companion delivers an edge-to-edge, OLED pure black interactive face view with fluid physical springs and tactile interaction:

- **Touch & Hold Voice Aura:** Touch and hold anywhere on the screen (220ms threshold) to activate the luminous voice aura. Dynamic radial blooms (indigo, periwinkle, neon magenta, and electric cyan) swell and pulse in real time with the acoustic loudness of your voice via hardware-accelerated Web Audio metering.
- **Physical Spring Physics & Eye Tracking:** Trey's eyes, pupils, eyelids, and blueberry crown respond smoothly at 60fps to your finger's position across the screen, mimicking physical gaze mechanics.
- **Interactive Double-Tap Actions:** Double tap the character to wake Trey up with a cheerful musical chirp and playful eye hop.
- **Minimalist Floating Glass HUD:** Essential mission status, real-time voice meter capsule, countdown clock, and immediate Emergency STOP button float cleanly over the OLED canvas.
- **Swipe-Up Settings Drawer:** Swipe up or tap the settings pill to reveal mission timers (15m, 25m, 45m, 60m), mode switching, NIM API keys, and cartoon synthesizer sound volume.
- **Hardware-Accelerated QR Scanner:** Point your phone camera at your PC screen to pair in seconds; frames are decoded automatically via native `BarcodeDetector` with continuous `jsQR` canvas fallback.

---

## 🌟 Two Ways to Use Trey

You don't need a PC around to enjoy Trey. The app switches between two modes with a single tap:

### 1. 🤝 Companion Mode (Connected to your PC)
- **Live Eye & Expression Mirroring:** Trey blinks, looks around, and changes moods (`happy`, `focused`, `curious`, `alert`) in sync with your desktop.
- **Voice & Text Task Delegation:** Speak or type focus goals from your phone (*"Write the quarterly report"*, *"Finish coding the API"*); the PC receives the task and tracks your focus.
- **Live Timeline:** Watch real-time focus observations stream in directly to your phone screen.
- **🚨 Big Red STOP Button:** Hit the large red STOP button on your phone anytime to immediately pause desktop computer control and reset the focus session.
- **Freshness Sentinel:** If your PC goes to sleep or connection drops for >5 seconds, a gentle yellow badge alerts you, and reconnects automatically when you're back in range.

### 2.  مستقل Standalone Mode (No PC Needed!)
- **100% Standalone Focus Buddy:** Put your phone on your desk next to your notebook or workspace.
- **Direct AI Chat & Assistance:** Talks directly to **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1`). Enter your key in **Settings (⚙️)**; it stays strictly on your phone in hardware-backed storage.
- **Accurate Countdown Focus Timers:** Built with single-source-of-truth wall-clock math so seconds never skip or drift, even when your screen is locked.
- **Offline Cartoon Voice Synthesizer:** Trey talks back using playful pentatonic musical chirps (C5..E6) generated completely offline with zero extra downloads.

---

## 🔒 Privacy & Safety Guarantees

Trey is designed around strict privacy:

- **Zero Disk Writes for Screen & Audio:** Screen analysis and microphone audio exist strictly in volatile RAM. No screenshots, OCR text files, or voice recordings are ever saved to your hard drive.
- **No Shared Master Secrets:** Your phone never stores your PC's master API keys, and your PC never gets your phone's personal credentials. All pairing traffic uses temporary directional session keys that expire automatically.
- **Screen Text is Untrusted:** Screen content is treated as inert data and never as instructions to execute arbitrary code.
- **100% Revocable:** You can revoke any paired phone from your PC dashboard with a single click.

---

## ⌨️ Handy PC Shortcuts

- **Hold `J` (or `Ctrl+J` / `Alt+J`):** Push-to-Talk voice input. Speak to Trey directly on your PC!
- **Press `K` (or `Ctrl+K` / `Alt+K`):** Emergency Pause / Resume hotkey.

---

## 🛠️ Building from Source (Developers)

If you'd like to inspect the code or build from source:

```bash
# Clone the repository
git clone https://github.com/chiragsatish2011-pixel/Nomin-s-Trey.git
cd Nomin-s-Trey

# Install monorepo dependencies
npm install

# Run automated tests (80 tests across 15 suites)
npm test

# Run strict typecheck & lint audit
npm run typecheck
npm run lint

# Start desktop app in dev mode
npm run dev

# Build Windows installer
npm --workspace=@nomin/desktop run installer

# Build Mobile web bundle
npm --workspace=@nomin/mobile run build
```

---

## 💙 Credits & Acknowledgements

- **Author & Founder:** Chirag S
- **Organization:** Nomin / The Nomin Company
- **Copyright:** Copyright (c) 2026 Nomin / Chirag S
- **Inspiration:** Character design and pairing architecture inspired by Bluey by Riley Brown (dedicated under The Unlicense / Public Domain).
- **Notices:** Full third-party licenses and font credits are maintained in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
