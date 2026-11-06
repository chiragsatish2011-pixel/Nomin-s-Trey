import { windowsScreenCapture } from './platform/windows/WindowsScreenCapture'
import { windowsOcr } from './platform/windows/WindowsOcr'
import { windowsForegroundApp } from './platform/windows/WindowsForegroundApp'
import { windowsIdleMonitor } from './platform/windows/WindowsIdleMonitor'
import type { OcrResult, ForegroundAppInfo, CaptureResult } from '@bluey/core'

export interface PerceptionSnapshot {
  capture: CaptureResult
  ocr: OcrResult
  app: ForegroundAppInfo
  idleSeconds: number
  capturedAt: number
}

export class PerceptionManager {
  async snapshot(): Promise<PerceptionSnapshot> {
    const capturedAt = Date.now()

    // 1. Capture display
    const capture = await windowsScreenCapture.captureDisplay()

    // 2. OCR and Foreground app in parallel
    const [ocr, app, idleSeconds] = await Promise.all([
      windowsOcr.recognize(capture.jpeg),
      windowsForegroundApp.getForegroundApp(),
      windowsIdleMonitor.getIdleSeconds()
    ])

    return {
      capture,
      ocr,
      app,
      idleSeconds,
      capturedAt
    }
  }
}

export const perceptionManager = new PerceptionManager()
