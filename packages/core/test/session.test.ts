import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionEngine } from '../src/session/SessionEngine.js'

describe('SessionEngine & FocusClock logic', () => {
  it('developer clock runs 4x faster and pause still freezes it (matching FocusTests.swift)', () => {
    const engine = new SessionEngine()
    engine.start('Test Trey', 60, true)

    expect(engine.checkInterval).toBe(10)
    expect(engine.observationDuration).toBe(40)

    engine.advance(1)
    expect(engine.getSession()?.elapsed).toBe(4)
    expect(engine.realActiveElapsed).toBe(1)

    engine.pause('Testing')
    engine.advance(100)
    expect(engine.getSession()?.elapsed).toBe(4)
    expect(engine.realActiveElapsed).toBe(1)
    expect(engine.status).toBe('paused')

    engine.resume()
    expect(engine.status).toBe('running')

    // Remaining focus time is 60 - 4 = 56 focus seconds.
    // In developer mode (4x), 56 focus seconds takes 56 / 4 = 14 real seconds.
    // When advancing 20 real seconds, it should clamp at expiry:
    // realActiveElapsed reaches 1 + 14 = 15, elapsed reaches 60.
    engine.advance(20)
    expect(engine.status).toBe('ended')
    expect(engine.getSession()?.elapsed).toBe(60)
    expect(engine.realActiveElapsed).toBe(15)
  })

  it('changing speed preserves both clocks and marks test history (matching FocusTests.swift)', () => {
    const engine = new SessionEngine()
    engine.start('Test speed changes', 1800, false)

    engine.advance(10)
    expect(engine.getSession()?.elapsed).toBe(10)
    expect(engine.realActiveElapsed).toBe(10)

    engine.setDeveloperMode(true)
    engine.advance(10)
    expect(engine.getSession()?.elapsed).toBe(50)
    expect(engine.realActiveElapsed).toBe(20)

    engine.setDeveloperMode(false)
    engine.advance(10)
    expect(engine.getSession()?.elapsed).toBe(60)
    expect(engine.realActiveElapsed).toBe(30)
    expect(engine.getSession()?.usedDeveloperMode).toBe(true)
    expect(engine.clockRate).toBe(1)
  })

  it('formats clock strings properly', () => {
    expect(SessionEngine.formatClock(0)).toBe('00:00')
    expect(SessionEngine.formatClock(59.1)).toBe('01:00')
    expect(SessionEngine.formatClock(1800)).toBe('30:00')
    expect(SessionEngine.formatClock(125)).toBe('02:05')
  })

  it('enforces duration clamps and task truncation', () => {
    const engine = new SessionEngine()
    engine.start('Task with default duration')
    expect(engine.getSession()?.duration).toBe(1800)

    const shortEngine = new SessionEngine()
    shortEngine.start('Too short', 10)
    expect(shortEngine.getSession()?.duration).toBe(60) // min 1 min

    const longEngine = new SessionEngine()
    longEngine.start('Too long', 999999)
    expect(longEngine.getSession()?.duration).toBe(14400) // max 240 min
  })

  it('records pause check on pause', () => {
    const engine = new SessionEngine()
    engine.start('Pause check test', 600)
    engine.advance(30)
    engine.pause('Meeting break')

    const session = engine.getSession()
    expect(session?.checks.length).toBe(1)
    expect(session?.checks[0].activity).toBe('paused')
    expect(session?.checks[0].elapsed).toBe(30)
    expect(session?.detail).toBe('Meeting break')
  })

  it('records perception results on the live session rather than a returned snapshot', () => {
    const engine = new SessionEngine()
    engine.start('Verify screen checks', 600)
    const snapshot = engine.getSession()
    expect(snapshot).not.toBeNull()

    engine.recordCheck({
      id: 'check-1',
      elapsed: 30,
      activity: 'off_task',
      probability: 0.8,
      confidence: 0.9,
      nudged: false
    }, 'Off task · checking again before nudging')

    expect(snapshot?.checks).toHaveLength(0)
    expect(engine.getSession()?.checks).toHaveLength(1)
    expect(engine.getSession()?.detail).toBe('Off task · checking again before nudging')
  })

  describe('Timestamp-based monotonic clock & fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('samples at 250ms interval with NO skipped second values over 10 minutes', () => {
      const engine = new SessionEngine()
      const totalSeconds = 600 // 10 minutes
      engine.start('10 min focus test', totalSeconds, false, Date.now())

      const seenSeconds = new Set<number>()
      const totalTicks = totalSeconds * 4 // 250ms ticks -> 4 ticks per second

      seenSeconds.add(Math.ceil(engine.remaining))

      for (let i = 0; i < totalTicks; i++) {
        vi.advanceTimersByTime(250)
        engine.syncClock(Date.now())
        seenSeconds.add(Math.ceil(engine.remaining))
      }

      // Must have encountered every single integer second from 600 down to 0
      for (let sec = totalSeconds; sec >= 0; sec--) {
        expect(seenSeconds.has(sec)).toBe(true)
      }
      expect(seenSeconds.size).toBe(totalSeconds + 1)
      expect(engine.status).toBe('ended')
    })

    it('freezes elapsed time exactly on pause and resumes accurately', () => {
      const engine = new SessionEngine()
      engine.start('Pause freeze test', 600, false, Date.now())

      // Run for 10 seconds (40 ticks at 250ms)
      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(250)
        engine.syncClock(Date.now())
      }
      expect(Math.round(engine.remaining)).toBe(590)
      expect(Math.round(engine.getSession()?.elapsed ?? 0)).toBe(10)

      // Pause for 10 minutes (600,000 ms)
      engine.pause('User stepped away', Date.now())
      vi.advanceTimersByTime(600_000)
      engine.syncClock(Date.now())

      // Elapsed must remain frozen at exactly 10s
      expect(Math.round(engine.remaining)).toBe(590)
      expect(Math.round(engine.getSession()?.elapsed ?? 0)).toBe(10)
      expect(engine.status).toBe('paused')

      // Resume and run for another 10 seconds (40 ticks)
      engine.resume(Date.now())
      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(250)
        engine.syncClock(Date.now())
      }
      expect(Math.round(engine.remaining)).toBe(580)
      expect(Math.round(engine.getSession()?.elapsed ?? 0)).toBe(20)
      expect(Math.round(engine.realActiveElapsed)).toBe(20)
    })

    it('catches up accurately without drifting after a simulated 5-second main-thread stall', () => {
      const engine = new SessionEngine()
      engine.start('Stall resilience test', 600, false, Date.now())

      // Run normally for 4 seconds (16 ticks)
      for (let i = 0; i < 16; i++) {
        vi.advanceTimersByTime(250)
        engine.syncClock(Date.now())
      }
      expect(Math.round(engine.remaining)).toBe(596)

      // Simulate a 5-second thread stall (e.g. heavy OCR / screen capture lock)
      // Time advances 5000ms with zero ticks running during the stall
      vi.advanceTimersByTime(5000)

      // Next tick fires after the stall
      engine.syncClock(Date.now())

      // Remaining must immediately reflect the 4s + 5s = 9s elapsed -> 591s
      expect(Math.round(engine.remaining)).toBe(591)
      expect(Math.round(engine.getSession()?.elapsed ?? 0)).toBe(9)
      expect(SessionEngine.formatClock(engine.remaining)).toBe('09:51')
    })
  })
})
