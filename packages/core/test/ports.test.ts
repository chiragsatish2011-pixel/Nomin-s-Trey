import { describe, it, expect } from 'vitest'
import {
  LinuxScreenCaptureStub,
  AndroidScreenCaptureStub,
  LinuxOcrStub,
  AndroidOcrStub,
  LinuxForegroundAppStub,
  AndroidForegroundAppStub,
  LinuxIdleMonitorStub,
  AndroidIdleMonitorStub,
  LinuxSecretStoreStub,
  AndroidSecretStoreStub,
  LinuxPushToTalkStub,
  AndroidPushToTalkStub,
  LinuxHistoryStore,
  AndroidHistoryStore,
  WINDOWS_CAPABILITIES,
  LINUX_CAPABILITIES,
  ANDROID_CAPABILITIES,
  HistoryRecord
} from '../src/index.js'

describe('Port Stubs & Capabilities Matrix', () => {
  it('verifies platform capabilities declarations', () => {
    expect(WINDOWS_CAPABILITIES.platform).toBe('windows')
    expect(WINDOWS_CAPABILITIES.canCaptureScreen).toBe(true)
    expect(WINDOWS_CAPABILITIES.canTrackCursor).toBe(true)
    expect(WINDOWS_CAPABILITIES.canStoreHistory).toBe(true)

    expect(LINUX_CAPABILITIES.platform).toBe('linux')
    expect(LINUX_CAPABILITIES.canCaptureScreen).toBe(false)

    expect(ANDROID_CAPABILITIES.platform).toBe('android')
    expect(ANDROID_CAPABILITIES.canTrackCursor).toBe(false)
  })

  it('verifies all Linux stubs throw NotImplementedError', async () => {
    await expect(new LinuxScreenCaptureStub().captureDisplay()).rejects.toThrow(
      "Port 'ScreenCapture' is not implemented on platform 'linux'."
    )
    await expect(new LinuxOcrStub().recognize()).rejects.toThrow(
      "Port 'Ocr' is not implemented on platform 'linux'."
    )
    await expect(new LinuxForegroundAppStub().getForegroundApp()).rejects.toThrow(
      "Port 'ForegroundApp' is not implemented on platform 'linux'."
    )
    await expect(new LinuxIdleMonitorStub().getIdleSeconds()).rejects.toThrow(
      "Port 'IdleMonitor' is not implemented on platform 'linux'."
    )
    await expect(new LinuxSecretStoreStub().getSecret('k')).rejects.toThrow(
      "Port 'SecretStore' is not implemented on platform 'linux'."
    )
    await expect(new LinuxPushToTalkStub().start({ onKeyDown: () => {}, onKeyUp: () => {} })).rejects.toThrow(
      "Port 'PushToTalk' is not implemented on platform 'linux'."
    )
    await expect(new LinuxHistoryStore().loadHistory()).rejects.toThrow(
      "Port 'HistoryStore' is not implemented on platform 'linux'."
    )
  })

  it('verifies all Android stubs throw NotImplementedError', async () => {
    await expect(new AndroidScreenCaptureStub().captureDisplay()).rejects.toThrow(
      "Port 'ScreenCapture' is not implemented on platform 'android'."
    )
    await expect(new AndroidOcrStub().recognize()).rejects.toThrow(
      "Port 'Ocr' is not implemented on platform 'android'."
    )
    await expect(new AndroidForegroundAppStub().getForegroundApp()).rejects.toThrow(
      "Port 'ForegroundApp' is not implemented on platform 'android'."
    )
    await expect(new AndroidIdleMonitorStub().getIdleSeconds()).rejects.toThrow(
      "Port 'IdleMonitor' is not implemented on platform 'android'."
    )
    await expect(new AndroidSecretStoreStub().getSecret('k')).rejects.toThrow(
      "Port 'SecretStore' is not implemented on platform 'android'."
    )
    await expect(new AndroidPushToTalkStub().start({ onKeyDown: () => {}, onKeyUp: () => {} })).rejects.toThrow(
      "Port 'PushToTalk' is not implemented on platform 'android'."
    )
    await expect(new AndroidHistoryStore().saveSession({} as HistoryRecord)).rejects.toThrow(
      "Port 'HistoryStore' is not implemented on platform 'android'."
    )
  })
})
