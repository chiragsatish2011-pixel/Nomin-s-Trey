/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Multi-monitor and DPI scaling coordinate transformation utilities.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayBounds {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

export interface VirtualScreenBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface ScreenPointMapping {
  physicalX: number
  physicalY: number
  logicalX: number
  logicalY: number
  normalizedX: number
  normalizedY: number
}

export class CoordinateMath {
  /**
   * Converts an OCR bounding box from a downscaled image to absolute screen coordinates in logical pixels.
   */
  static ocrToScreenPoint(
    ocrBox: Rect,
    downscaledSize: { width: number; height: number },
    display: DisplayBounds
  ): Rect {
    const scaleX = display.width / downscaledSize.width
    const scaleY = display.height / downscaledSize.height

    return {
      x: display.x + ocrBox.x * scaleX,
      y: display.y + ocrBox.y * scaleY,
      width: ocrBox.width * scaleX,
      height: ocrBox.height * scaleY
    }
  }

  /**
   * Computes center point of a bounding box.
   */
  static centerPoint(rect: Rect): { x: number; y: number } {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    }
  }

  /**
   * Formats coordinates on a 0-1000 grid for model prompts (@x,y).
   */
  static toGrid(rect: Rect, totalSize: { width: number; height: number }): { x: number; y: number; label: string } {
    const center = this.centerPoint(rect)
    const gx = Math.round((center.x / totalSize.width) * 1000)
    const gy = Math.round((center.y / totalSize.height) * 1000)
    return {
      x: gx,
      y: gy,
      label: `@${gx},${gy}`
    }
  }

  /**
   * Checks if two boxes match within a tolerance threshold (in screen points).
   */
  static matchesWithTolerance(a: Rect, b: Rect, tolerance = 10): boolean {
    const ca = this.centerPoint(a)
    const cb = this.centerPoint(b)
    return Math.abs(ca.x - cb.x) <= tolerance && Math.abs(ca.y - cb.y) <= tolerance
  }

  /**
   * Translates a coordinate from model space (image coordinates or 0..1000 grid)
   * into physical screen pixels, logical DIPs (for Electron overlay), and SendInput virtual desk units.
   */
  static modelToScreenPoint(
    modelCoord: { x: number; y: number },
    capturedSize: { width: number; height: number },
    display: DisplayBounds,
    virtualScreen?: VirtualScreenBounds
  ): ScreenPointMapping {
    let u: number
    let v: number

    if (capturedSize.width <= 0 || capturedSize.height <= 0) {
      u = Math.min(1, Math.max(0, modelCoord.x / 1000))
      v = Math.min(1, Math.max(0, modelCoord.y / 1000))
    } else {
      u = Math.min(1, Math.max(0, modelCoord.x / capturedSize.width))
      v = Math.min(1, Math.max(0, modelCoord.y / capturedSize.height))
    }

    const logicalX = Math.round(display.x + u * display.width)
    const logicalY = Math.round(display.y + v * display.height)

    const dispPhysicalWidth = Math.round(display.width * display.scaleFactor)
    const dispPhysicalHeight = Math.round(display.height * display.scaleFactor)
    const dispPhysicalX = Math.round(display.x * display.scaleFactor)
    const dispPhysicalY = Math.round(display.y * display.scaleFactor)

    const physicalX = Math.round(dispPhysicalX + u * dispPhysicalWidth)
    const physicalY = Math.round(dispPhysicalY + v * dispPhysicalHeight)

    const vDesk = virtualScreen ?? {
      left: dispPhysicalX,
      top: dispPhysicalY,
      width: dispPhysicalWidth,
      height: dispPhysicalHeight
    }

    const normalizedX = Math.floor(((physicalX - vDesk.left) * 65536) / Math.max(1, vDesk.width))
    const normalizedY = Math.floor(((physicalY - vDesk.top) * 65536) / Math.max(1, vDesk.height))

    return {
      physicalX,
      physicalY,
      logicalX,
      logicalY,
      normalizedX: Math.max(0, Math.min(65535, normalizedX)),
      normalizedY: Math.max(0, Math.min(65535, normalizedY))
    }
  }
}
