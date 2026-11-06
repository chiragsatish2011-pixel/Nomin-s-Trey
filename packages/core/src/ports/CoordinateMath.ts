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
}
