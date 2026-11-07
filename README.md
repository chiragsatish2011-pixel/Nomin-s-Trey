# Trey by Nomin

**Product:** Trey by Chirag S / The Nomin Company (`com.nomin.trey`)  
**Creator & Lead Engineer:** Chirag S  
**Organization:** Nomin / The Nomin Company  
**Copyright:** Copyright (c) 2026 Nomin / Chirag S  
**Repository:** [Nomin-s-Trey](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey.git)  

Trey is an intelligent desktop focus companion and mobile copilot. Trey sits on your desktop watching your cursor with fluid spring physics, inspects your screen against declared focus goals, executes agentic computer actions, and gently nudges you with cinematic takeover spotlights when you drift. With the Android Companion app, Trey travels with you: monitor tasks on the go, issue voice or text instructions, trigger an emergency STOP from across the room, or run Trey in standalone mode as a personal focus buddy powered directly by NVIDIA NIM.

---

## Downloads

Download the latest official releases for Windows and Android from the [GitHub Releases Page](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases):

- **Windows Desktop:** `Trey-Setup-0.2.1.exe` (Windows 10 / 11 64-bit installer)
- **Android Companion App:** `trey-companion-v0.2.1.apk` (Android 8.0+ / API 24+)
- **Verification:** Checksums published in `SHA256SUMS.txt`

### Android Installation Steps
1. Download `trey-companion-v0.2.1.apk` onto your Android phone.
2. Open the downloaded file. When prompted by Android, tap **Settings** and toggle **"Allow installation from this source"**.
3. Tap **Install** to complete the installation.

---

## Operating Modes

Trey supports two operational modes seamlessly in a single app:

### Mode A: Companion Mode (Paired with PC)
- **Character & Mood Sync:** Trey's face, gaze vector, blinks, and mood (`curious`, `happy`, `focused`, `sleepy`, `alert`) mirror the desktop session in real time with sub-100ms latency.
- **Remote Task Delegation:** Speak or type focus tasks directly into your phone; they are securely relayed to the desktop engine.
- **Live Timeline & Step Feed:** Watch desktop focus checks, vision observations, and computer actions stream live.
- **Big Red Emergency STOP:** A prominent 64dp red STOP button instantly preempts desktop computer control, aborts agent loops, and pauses the session.
- **Freshness Sentinel:** Warns immediately if the connection to the PC drops for more than 5 seconds, and automatically reconnects with exponential backoff.

### Mode B: Standalone Mode (No PC Required)
- **100% Autonomous Focus Buddy:** Operates independently without a PC.
- **NVIDIA NIM Integration:** Directly queries NVIDIA NIM (`https://integrate.api.nvidia.com/v1`) using a user-supplied API key securely stored in the Android Keystore / EncryptedSharedPreferences.
- **Single-Source-of-Truth Countdown Timer:** Wall-clock based monotonic timer that never drifts or skips seconds.
- **Cartoon Voice Synthesizer:** Offline procedural pentatonic chirps (C5..E6) with zero disk footprint.
- **Device Control (Opt-In):** System-level accessibility control is disabled by default and requires explicit opt-in.

---

## Pairing Guide

Pairing between your PC and Android phone is end-to-end encrypted and takes under 10 seconds:

1. **Open Desktop Dashboard:** Launch Trey on Windows. Open the Dashboard window and click **"Pair Phone"** in the sidebar.
2. **Scan the QR Code:** Desktop displays an ephemeral QR code encoding a one-time 256-bit cryptographically random secret (expires in 5 minutes and consumed upon first use).
3. **Mutual Handshake:** Open Trey on Android, tap the camera icon, and point your camera at the QR code (or paste the code manually).
4. **Encrypted Session:** Both devices exchange cryptographic proofs via HMAC-SHA256 and derive directional session keys (`trey-companion-desktop-to-mobile` and `trey-companion-mobile-to-desktop`) via HKDF-SHA256. All subsequent frames are encrypted using AES-256-GCM with replay-protected sequence counters.
5. **Revocation:** You can view all paired mobile devices and revoke any device at any time from the Desktop Dashboard.

---

## Security & Privacy Guarantees

- **Zero Screenshot / Audio Disk Writes:** Screen frames and microphone buffers are processed strictly in volatile memory. No screenshots, OCR text, or audio recordings are ever written to disk.
- **No Long-Lived Secret Exposure:** The mobile companion never receives your PC's master API keys or desktop credentials. Only short-lived, directional session keys are used.
- **Screen Text is Untrusted:** Captured screen OCR and visual data are treated as untrusted input and never interpreted as system instructions.
- **Hardware-Enforced Cryptography:** Local secrets on Windows are secured via Windows DPAPI; on Android, API keys are stored using hardware-backed Android Keystore / AES-256-GCM encryption.

---

## Building from Source

### Prerequisites
- Node.js 20+ and npm 10+
- Windows 10 / 11 (for desktop build)
- Java 17 + Android SDK (for mobile APK build)

### Build Steps

```sh
# Clone repository
git clone https://github.com/chiragsatish2011-pixel/Nomin-s-Trey.git
cd Nomin-s-Trey

# Install all monorepo dependencies
npm install

# Run all test suites (80/80 tests passing across 15 suites)
npm test

# Run monorepo typecheck & strict ESLint audit
npm run typecheck
npm run lint

# Build Desktop bundles
npm --workspace=@nomin/desktop run build

# Build Windows NSIS installer
npm --workspace=@nomin/desktop run installer

# Build Mobile web bundle
npm --workspace=@nomin/mobile run build
```

---

## Credits & Acknowledgements

- **Author & Founder:** Chirag S
- **Organization:** Nomin / The Nomin Company
- **Copyright:** Copyright (c) 2026 Nomin / Chirag S
- **Inspiration:** Pairing protocol architecture and character animation design inspired by Bluey by Riley Brown (dedicated under The Unlicense / Public Domain).
- **Third-Party Licenses:** Full notices and attributions in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
