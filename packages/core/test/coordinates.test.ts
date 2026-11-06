import { describe, it, expect } from 'vitest'
import { CoordinateMath } from '../src/ports/CoordinateMath.js'

describe('CoordinateMath across multi-monitor & DPI scaling', () => {
  it('converts OCR box on primary 1080p display (100% scale)', () => {
    const display = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1.0 }
    const downscaled = { width: 1024, height: 576 }

    // OCR found a line at x=512, y=288 with size 200x30 in downscaled image
    const ocrBox = { x: 512, y: 288, width: 200, height: 30 }
    const screenBox = CoordinateMath.ocrToScreenPoint(ocrBox, downscaled, display)

    expect(screenBox.x).toBeCloseTo(960)
    expect(screenBox.y).toBeCloseTo(540)
    expect(screenBox.width).toBeCloseTo(375)
    expect(screenBox.height).toBeCloseTo(56.25)
  })

  it('converts OCR box with 150% scaling on secondary display', () => {
    // Secondary display at x=1920, y=0, width=1707, height=960 (logical DIPs at 150% of 2560x1440)
    const secondaryDisplay = { x: 1920, y: 0, width: 1707, height: 960, scaleFactor: 1.5 }
    const downscaled = { width: 1024, height: 576 }

    const ocrBox = { x: 100, y: 100, width: 80, height: 20 }
    const screenBox = CoordinateMath.ocrToScreenPoint(ocrBox, downscaled, secondaryDisplay)

    // Expected x = 1920 + 100 * (1707 / 1024) = 1920 + 166.699 = 2086.7
    expect(screenBox.x).toBeGreaterThan(1920)
    expect(screenBox.x).toBeCloseTo(2086.7, 0)
    expect(screenBox.y).toBeCloseTo(166.66, 0)
  })

  it('computes 0-1000 grid coordinates accurately', () => {
    const box = { x: 400, y: 250, width: 200, height: 100 } // center at 500, 300
    const totalSize = { width: 1000, height: 1000 }

    const grid = CoordinateMath.toGrid(box, totalSize)
    expect(grid.x).toBe(500)
    expect(grid.y).toBe(300)
    expect(grid.label).toBe('@500,300')
  })

  it('validates re-read matching within 10 point tolerance', () => {
    const original = { x: 500, y: 400, width: 100, height: 30 }
    const slightShift = { x: 504, y: 403, width: 100, height: 30 }
    const bigShift = { x: 525, y: 400, width: 100, height: 30 }

    expect(CoordinateMath.matchesWithTolerance(original, slightShift, 10)).toBe(true)
    expect(CoordinateMath.matchesWithTolerance(original, bigShift, 10)).toBe(false)
  })
})
