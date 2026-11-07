import { desktopCapturer, screen } from 'electron'
import type { ScreenCapture, CaptureResult } from '@nomin/core'

export class WindowsScreenCapture implements ScreenCapture {
  async captureDisplay(options?: { primaryOnly?: boolean }): Promise<CaptureResult> {
    const primary = screen.getPrimaryDisplay()
    let targetDisplay = primary

    if (!options?.primaryOnly) {
      // Find display where cursor is currently located
      const cursor = screen.getCursorScreenPoint()
      targetDisplay = screen.getDisplayNearestPoint(cursor) || primary
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(1024, targetDisplay.bounds.width),
        height: Math.min(1024, targetDisplay.bounds.height)
      }
    })

    // Match source by display_id or fallback to first
    const source = sources.find((s) => s.display_id === String(targetDisplay.id)) || sources[0]

    if (!source) {
      throw new Error('No display capture source found.')
    }

    // Downscale to max 1024px width while preserving aspect ratio
    const originalImage = source.thumbnail
    const originalSize = originalImage.getSize()
    const maxWidth = 1024
    const scale = originalSize.width > maxWidth ? maxWidth / originalSize.width : 1.0

    const targetWidth = Math.round(originalSize.width * scale)
    const targetHeight = Math.round(originalSize.height * scale)

    const resized = originalImage.resize({
      width: targetWidth,
      height: targetHeight,
      quality: 'good'
    })

    // JPEG ~70% quality, strictly in-memory
    const jpegBuffer = resized.toJPEG(70)

    return {
      jpeg: new Uint8Array(jpegBuffer),
      width: targetWidth,
      height: targetHeight,
      scaleFactor: targetDisplay.scaleFactor,
      displayId: String(targetDisplay.id)
    }
  }
}

export const windowsScreenCapture = new WindowsScreenCapture()
