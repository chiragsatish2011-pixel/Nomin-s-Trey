import { describe, it, expect } from 'vitest'
import { FocusActivitySchema, NotImplementedError } from '../src/index.js'

describe('@bluey/core environment and schema sanity', () => {
  it('runs in plain Node without Electron or DOM window', () => {
    expect(typeof process).toBe('object')
    expect(typeof (globalThis as Record<string, unknown>).window).toBe('undefined')
    expect(typeof (globalThis as Record<string, unknown>).document).toBe('undefined')
  })

  it('validates FocusActivity enum via zod', () => {
    expect(FocusActivitySchema.parse('on_task')).toBe('on_task')
    expect(FocusActivitySchema.parse('off_task')).toBe('off_task')
    expect(FocusActivitySchema.parse('uncertain')).toBe('uncertain')
    expect(() => FocusActivitySchema.parse('invalid_choice')).toThrow()
  })

  it('constructs NotImplementedError with expected message', () => {
    const err = new NotImplementedError('ScreenCapture', 'linux')
    expect(err.message).toContain("Port 'ScreenCapture' is not implemented on platform 'linux'")
    expect(err.name).toBe('NotImplementedError')
  })
})
