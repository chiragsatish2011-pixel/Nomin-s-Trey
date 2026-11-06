import { NotImplementedError } from './Capabilities.js'

export interface CaptureResult {
  jpeg: Uint8Array
  width: number
  height: number
  scaleFactor: number
  displayId: string
}

export interface ScreenCapture {
  captureDisplay(options?: { primaryOnly?: boolean }): Promise<CaptureResult>
}

export class LinuxScreenCaptureStub implements ScreenCapture {
  async captureDisplay(): Promise<CaptureResult> {
    throw new NotImplementedError('ScreenCapture', 'linux')
  }
}

export class AndroidScreenCaptureStub implements ScreenCapture {
  async captureDisplay(): Promise<CaptureResult> {
    throw new NotImplementedError('ScreenCapture', 'android')
  }
}
