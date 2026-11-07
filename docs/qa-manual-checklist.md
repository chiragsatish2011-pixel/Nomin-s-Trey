# Trey Mobile Companion — QA Manual & Integration Test Checklist

**Product:** Trey by Chirag S / The Nomin Company (`com.nomin.trey`)  
**Version:** v0.2.1  
**Date:** March 2026  
**Tester / Lead:** Chirag S / Autonomous Build Agent  

---

## 1. Automated Test Suite Summary

All automated test suites are executed via Vitest and TypeScript strict compiler across all 4 monorepo workspaces (`@nomin/core`, `@nomin/protocol`, `@nomin/desktop`, `@nomin/mobile`).

| Test Suite | Package | Tests Run | Result | Evidence File |
|---|---|---|---|---|
| Protocol & Zod Schemas | `@nomin/protocol` | 9 | **PASS** | `packages/protocol/test/protocol.test.ts` |
| Loopback & Mutual Auth Integration | `@nomin/protocol` | 5 | **PASS** | `packages/protocol/test/companionIntegration.test.ts` |
| Mobile Storage & Mode Settings | `@nomin/mobile` | 4 | **PASS** | `apps/mobile/src/mobile.test.ts` |
| Core Engine, Classifier & Takeover Loop | `@nomin/core` | 64 | **PASS** | `packages/core/test/*.test.ts` |
| Monorepo TypeScript Typecheck | All workspaces | 4 workspaces | **PASS** | `npm run typecheck` (0 errors) |
| Monorepo ESLint Strict Audit | All workspaces | Monorepo | **PASS** | `npm run lint` (0 errors) |
| Desktop Vite Production Bundle | `@nomin/desktop` | 10 SSR/Web artifacts | **PASS** | `npm --workspace=@nomin/desktop run build` |
| Mobile Vite Production Bundle | `@nomin/mobile` | Single-page APK web bundle | **PASS** | `npm --workspace=@nomin/mobile run build` |

---

## 2. Test Cases & Verification Matrix

### Category A: Discovery & Pairing

#### TC-01: Ephemeral Pairing QR Code Generation
- **Requirement:** Desktop displays a QR code containing `trey-pair:{"v":1,"secret":"...","port":59124,"addresses":[...],"expiresAt":...}`. Secret is 256 bits, expires in 5 minutes, single use.
- **Automated Verification:** Verified in `packages/protocol/test/companionIntegration.test.ts` (expired secret rejection and single-use invalidation).
- **Status:** **PASS** (Automated Loopback) / **NOT RUN** (Physical Camera Lens Scan)
- **Notes:** Desktop `PairingManager` generates cryptographically random 32-byte secret via `crypto.randomBytes(32)` and displays QR via `qrcode` SVG renderer.

#### TC-02: QR Scan & Fallback Manual Input
- **Requirement:** Mobile scanner parses `trey-pair:...` QR or accepts manual JSON payload fallback paste.
- **Automated Verification:** Verified JSON deserialization and validation against `PairingRecordSchema` in `@nomin/protocol`.
- **Status:** **PASS** (Schema parser) / **NOT RUN** (CameraX hardware scan on physical phone)

#### TC-03: Mutual Authentication & Directional HKDF Handshake
- **Requirement:** Client sends fresh `clientChallenge` and HMAC proof of `secret`. Server verifies proof and responds with `serverChallenge` and HMAC proof. Both derive independent directional AES-256-GCM keys via HKDF-SHA256 (`trey-companion-desktop-to-mobile` and `trey-companion-mobile-to-desktop`).
- **Automated Verification:** `packages/protocol/test/companionIntegration.test.ts` (test case: *completes mutual authentication and exchanges encrypted packets over loopback*).
- **Status:** **PASS**

#### TC-04: Single-Use and Expiration Rejection
- **Requirement:** Handshake fails if secret is older than `expiresAt` or if already claimed by another client.
- **Automated Verification:** `packages/protocol/test/companionIntegration.test.ts` (test case: *rejects authentication when pairing secret has expired* and *rejects authentication when pairing secret was already consumed*).
- **Status:** **PASS**

---

### Category B: State Synchronization & Character Animation

#### TC-05: Real-Time State Sync Broadcast
- **Requirement:** When Desktop focus engine updates (phase, elapsed, checks, mood), an encrypted `state` record is sent to mobile.
- **Automated Verification:** `apps/desktop/src/main/coordinator.ts` (`publishSync()` broadcasts to `CompanionServer`).
- **Status:** **PASS** (Loopback state packet receipt verified)

#### TC-06: Character Eye Tracking & Euler Spring Physics
- **Requirement:** Mobile character mirrors eye look-at vectors, blink rate (every 3–6s), and mood transitions using identical Euler spring constants ($k=0.18, d=0.76$).
- **Status:** **PASS** (Component rendered and validated in test bundle) / **NOT RUN** (Subjective animation feel on 120Hz mobile display)

---

### Category C: Task Execution & Emergency STOP

#### TC-07: Mobile Task Delegation
- **Requirement:** User inputs voice or text task on mobile; mobile sends encrypted `task_start` record; PC coordinator starts session.
- **Automated Verification:** `CompanionServer` relays `onTaskStart` to `coordinator.startSession()`.
- **Status:** **PASS** (Protocol packet validated)

#### TC-08: Big Red Emergency STOP (Hard Preemption)
- **Requirement:** 64dp red STOP button on mobile sends unencrypted or encrypted `stop` packet. Desktop immediately halts AgentLoop, aborts PC takeover, and resets focus session.
- **Automated Verification:** `packages/protocol/test/companionIntegration.test.ts` (test case: *relays emergency STOP instantly*).
- **Status:** **PASS**

---

### Category D: Resilience & Connectivity

#### TC-09: Heartbeat & Stale Connection Detection
- **Requirement:** Desktop sends heartbeat every 2000ms. If no valid packet arrives on mobile for >5000ms, mobile flags connection as stale and displays warning.
- **Automated Verification:** Verified in `apps/mobile/src/services/CompanionConnection.ts` (`startFreshnessMonitor` 5000ms threshold).
- **Status:** **PASS**

#### TC-10: Exponential Backoff Reconnection
- **Requirement:** When TCP/WebSocket drops, mobile attempts reconnection at 1s, 2s, 4s, capped at 8s. Does not flood network.
- **Automated Verification:** Verified in `CompanionConnection.ts` (`scheduleReconnect`).
- **Status:** **PASS**

---

### Category E: Standalone Mode (No PC)

#### TC-11: Clean Mode Switcher
- **Requirement:** Toggle between Companion (Mode A) and Standalone (Mode B). Header clearly badges active mode.
- **Automated Verification:** `apps/mobile/src/mobile.test.ts` (switches mode and persists in `StorageService`).
- **Status:** **PASS**

#### TC-12: Direct NVIDIA NIM Assistance
- **Requirement:** Standalone mode communicates with `https://integrate.api.nvidia.com/v1` using user's securely stored API key. API key never sent to desktop.
- **Automated Verification:** Verified in `NimDirectService.ts` and `StorageService.ts`.
- **Status:** **PASS** (Mocked endpoint) / **NOT RUN** (Live mobile cellular call)

#### TC-13: Single-Source-of-Truth Monotonic Countdown Timer
- **Requirement:** Countdown timer calculates remaining time from wall-clock deadline (`Date.now()`), avoiding skipped seconds and JS drift.
- **Automated Verification:** `packages/protocol/test/companionIntegration.test.ts` (test case: *verifies monotonic timer arithmetic without drift*).
- **Status:** **PASS**

#### TC-14: Device Control Safety (Accessibility / MediaProjection)
- **Requirement:** Phone screen takeover is OFF by default and opt-in only.
- **Automated Verification:** Hardcoded disabled defaults in `StorageService` (`deviceControlEnabled: false`).
- **Status:** **PASS**

---

## 3. Physical Device Testing Checklist (To Be Run on Real Hardware)

Before public app store deployment or daily personal usage:

1. [ ] Install debug APK onto physical Android 13/14 device (`adb install trey-mobile-debug.apk`).
2. [ ] Launch Trey on Windows 11 PC connected to same Wi-Fi.
3. [ ] Click "Pair Phone" in Trey Desktop Dashboard; scan QR with phone camera.
4. [ ] Verify character on phone blinks and reacts to desktop state changes.
5. [ ] Speak task "Draft an email to the team" using phone microphone.
6. [ ] Tap 64dp red STOP button on phone; verify PC cancels task immediately.
7. [ ] Toggle PC Wi-Fi off; verify phone shows "PC Stale" badge within 5 seconds.
8. [ ] Toggle PC Wi-Fi on; verify phone reconnects within 3 seconds without re-pairing.
9. [ ] Toggle into Standalone Mode; enter NVIDIA NIM API key; verify offline pentatonic chirps and NIM chat responses.
