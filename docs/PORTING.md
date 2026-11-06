# Porting Guide: Bluey on Linux and Android

This document provides a concrete architectural roadmap for porting Bluey to **Linux** and **Android**, building directly on the portable TypeScript core (`packages/core`).

---

## 1. Architectural Foundation: Ports & Adapters

`packages/core` contains 100% pure TypeScript business logic with zero imports of `electron`, `node:*`, or DOM globals.
All platform-specific facilities sit behind abstract ports in `packages/core/src/ports`:

| Port Interface | Windows Adapter (Current) | Linux Strategy (Planned) | Android Strategy (Planned) |
| :--- | :--- | :--- | :--- |
| `ScreenCapture` | `desktopCapturer` / DXGI | X11 `XShmGetImage` / Wayland `PipeWire` | `MediaProjection` API |
| `Ocr` | `tesseract.js` worker | `tesseract.js` or system `tesseract-ocr` | ML Kit Text Recognition (`com.google.mlkit:text-recognition`) |
| `ForegroundApp` | Win32 `GetForegroundWindow` | X11 `_NET_ACTIVE_WINDOW` / Wayland Portal | `UsageStatsManager` / Accessibility Service |
| `IdleMonitor` | `powerMonitor.getSystemIdleTime()` | X11 `XScreenSaverQueryInfo` / `libinput` | Android Screen on/off + touch dispatcher |
| `SecretStore` | Windows DPAPI (`safeStorage`) | `libsecret` (GNOME Keyring / KWallet) | Android Keystore / `EncryptedSharedPreferences` |
| `PushToTalk` | `uiohook-napi` (Ctrl+Alt+1) | X11 global grabs / Wayland `GlobalShortcuts` portal | Long-press volume button or floating overlay mic pill |
| `HistoryStore` | `%APPDATA%/Bluey/history.json` | `$XDG_DATA_HOME/bluey/history.json` | Room Database or private app storage `history.json` |

---

## 2. Porting to Linux

### 2.1 The X11 vs. Wayland Divide
Linux support requires handling two distinct display servers:

#### 1. X11
- **Screen Capture:**
  - Fast capture using `XShmGetImage` or Electron's native `desktopCapturer`.
- **Global Hotkeys:**
  - `XGrabKey` via `uiohook-napi` or `node-global-key-listener` functions reliably for push-to-talk (`Ctrl+Alt+1`) and emergency pause (`Ctrl+Alt+S`).
- **Overlays & Always-on-Top:**
  - Transparent, click-through overlay windows (`_NET_WM_WINDOW_TYPE_DOCK` with `XShapeCombineRectangles` or transparent RGBA visual) work consistently across window managers.
- **Active Window Detection:**
  - Query `_NET_ACTIVE_WINDOW` on the root window, then read `WM_CLASS` and `_NET_WM_NAME`.
- **Cursor Tracking:**
  - `XQueryPointer` provides low-overhead global cursor coordinates at 60Hz.

#### 2. Wayland
- **Screen Capture & PipeWire:**
  - Wayland security models explicitly prohibit arbitrary background applications from reading the framebuffer.
  - Screen capture requires the `org.freedesktop.portal.ScreenCast` D-Bus portal, streaming frames over PipeWire. The user must grant screen recording permission upon session startup.
- **Global Hotkeys:**
  - Standard global grabs are blocked. Use the `org.freedesktop.portal.GlobalShortcuts` portal (supported in GNOME 44+ and KDE Plasma 5.27+).
- **Overlays:**
  - Wayland does not allow arbitrary window positioning across multi-monitor coordinates.
  - Implement using `wlr-layer-shell` (on wlroots-based compositors like Sway/Hyprland) or a dedicated system tray notification fallback on GNOME/KDE.
- **Foreground App:**
  - Compositors restrict active window titles. Window state must be queried via compositor-specific D-Bus interfaces (e.g. `org.gnome.Shell.Extensions` or KWin scripting interface).

### 2.2 Linux Degradation Matrix
When running on Wayland without layer-shell or PipeWire access, Bluey degrades gracefully using `PlatformCapabilities`:
- If `canTrackCursor` is false: Googly eyes switch from cursor-tracking to a natural idle gaze-wandering animation.
- If `canOverlay` is false: Bluey delivers nudges via Desktop Notifications (`libnotify` / `Notification` API) rather than screen pointing overlays.

---

## 3. Porting to Android

### 3.1 Architecture for Android
Android is not a desktop environment: mouse cursors do not exist, and multiple apps rarely share a screen simultaneously.
The Android implementation will consist of a Kotlin/Jetpack Compose app shell hosting `packages/core` compiled via Node-API, QuickJS, or Kotlin-transpiled core:

```
Android App Shell (Kotlin / Jetpack Compose)
  ├── Foreground Service (FocusService)
  ├── Floating Bubble Overlay (SYSTEM_ALERT_WINDOW)
  ├── MediaProjection Capture Engine
  ├── ML Kit OCR Bridge
  └── packages/core (SessionEngine, NudgePolicy, NimGovernor, NimClient)
```

### 3.2 Required Android Permissions & Capabilities
1. **Screen Capture:**
   - Requires `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`.
   - The user must approve a system dialog upon starting a focus session. Frames are captured via `ImageReader` and scaled to max 1024px before passing to `packages/core`.
2. **Foreground App Detection:**
   - Requires `android.permission.PACKAGE_USAGE_STATS`.
   - Bluey inspects `UsageStatsManager.queryEvents` to determine the active foreground package (e.g. `com.twitter.android`, `com.google.android.youtube`).
3. **Floating Character Widget:**
   - Requires `android.permission.SYSTEM_ALERT_WINDOW`.
   - Render Bluey as a floating circular bubble or overlay. Since there is no mouse, Bluey's eyes track touch events on the screen or look in the direction of device orientation using accelerometer / gyroscope data!
4. **Push-to-Talk Voice:**
   - In place of `Ctrl+Alt+1`, speech is triggered by a floating mic pill attached to the bubble or a persistent notification action.
   - Speech-to-text uses Android's on-device `SpeechRecognizer` (`android.speech.SpeechRecognizer`).

---

## 4. Portability Verification Checklist

To verify clean separation before each release:
1. `packages/core` must compile with `tsc` without errors.
2. `packages/core` must pass all Vitest tests in pure Node (`npm test`).
3. Running a grep for `electron`, `node:*`, or DOM globals across `packages/core/src` must return **zero** results.
4. All port interfaces in `packages/core/src/ports` must export corresponding Linux and Android stubs throwing `NotImplementedError`.
5. The `PlatformCapabilities` object must accurately represent the current target environment.
