export class NotImplementedError extends Error {
  constructor(portName: string, platform: string) {
    super(`Port '${portName}' is not implemented on platform '${platform}'.`)
    this.name = 'NotImplementedError'
  }
}

export interface PlatformCapabilities {
  platform: 'windows' | 'linux' | 'android'
  canCaptureScreen: boolean
  canOcr: boolean
  canDetectForegroundApp: boolean
  canTrackCursor: boolean
  canPushToTalk: boolean
  canOverlay: boolean
  canSecureStore: boolean
  canStoreHistory: boolean
}

export const WINDOWS_CAPABILITIES: PlatformCapabilities = {
  platform: 'windows',
  canCaptureScreen: true,
  canOcr: true,
  canDetectForegroundApp: true,
  canTrackCursor: true,
  canPushToTalk: true,
  canOverlay: true,
  canSecureStore: true,
  canStoreHistory: true
}

export const LINUX_CAPABILITIES: PlatformCapabilities = {
  platform: 'linux',
  canCaptureScreen: false,
  canOcr: false,
  canDetectForegroundApp: false,
  canTrackCursor: false,
  canPushToTalk: false,
  canOverlay: false,
  canSecureStore: false,
  canStoreHistory: false
}

export const ANDROID_CAPABILITIES: PlatformCapabilities = {
  platform: 'android',
  canCaptureScreen: false,
  canOcr: false,
  canDetectForegroundApp: false,
  canTrackCursor: false,
  canPushToTalk: false,
  canOverlay: false,
  canSecureStore: false,
  canStoreHistory: false
}
