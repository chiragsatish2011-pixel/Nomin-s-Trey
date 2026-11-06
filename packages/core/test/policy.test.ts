import { describe, it, expect } from 'vitest'
import { NudgePolicy, CheckResult, ActivityChoice } from '../src/policy/NudgePolicy.js'

function makeCheck(
  t: number,
  pOff = 0.99,
  choice: ActivityChoice = 'off_task',
  latencySec = 1,
  confidence = 0.99,
  valid = true
): CheckResult {
  return {
    t,
    choice,
    pOff,
    pOn: 1 - pOff,
    pUnc: 0,
    confidence,
    valid,
    latencySec
  }
}

describe('NudgePolicy (ported from Swift FocusTests.swift)', () => {
  it('enforces 2-minute minimum span and 120s cooldown in normal mode', () => {
    const policy = new NudgePolicy()

    // Checks at 30, 60, 90, 120
    for (let t = 30; t <= 120; t += 30) {
      expect(policy.observe(makeCheck(t))).toBe(false)
    }

    // At t=150: span = 150 - 30 = 120s. strength >= 0.95 -> required = 120s. Nudge fires!
    expect(policy.observe(makeCheck(150))).toBe(true)

    // Cooldown active for checks at 180, 210, 240, 270
    for (let t = 180; t <= 270; t += 30) {
      expect(policy.observe(makeCheck(t))).toBe(false)
    }

    // At t=300: cooldown = 300 - 150 = 150 >= 120. span = 300 - 180 = 120s. Nudge fires!
    expect(policy.observe(makeCheck(300))).toBe(true)
  })

  it('moderate evidence (p=0.65) requires ~200s and weak evidence (p=0.50) requires 240s', () => {
    // 0.65 strength test: required = 240 - ((0.65 - 0.5) / 0.45) * 120 = 200s
    const moderate = new NudgePolicy()
    for (let t = 0; t <= 180; t += 30) {
      expect(moderate.observe(makeCheck(t, 0.65))).toBe(false)
    }
    // At t=210: span = 210 >= 200 -> Nudge!
    expect(moderate.observe(makeCheck(210, 0.65))).toBe(true)

    // 0.50 strength test: required = 240s
    const weak = new NudgePolicy()
    for (let t = 0; t <= 210; t += 30) {
      expect(weak.observe(makeCheck(t, 0.50))).toBe(false)
    }
    // At t=240: span = 240 >= 240 -> Nudge!
    expect(weak.observe(makeCheck(240, 0.50))).toBe(true)
  })

  it('accelerates in Developer Mode (40s-80s span) with 120 focus-sec cooldown', () => {
    const dev = new NudgePolicy({ maximumGap: 60, developerMode: true })

    // Observation at t=40
    expect(dev.observe(makeCheck(40))).toBe(false)

    // Second check at t=80: span = 80 - 40 = 40s >= 40s (minimum). Nudge fires!
    expect(dev.observe(makeCheck(80))).toBe(true)

    // Next checks: t=120 (first check in new run)
    expect(dev.observe(makeCheck(120))).toBe(false)

    // At t=160: span = 40s, but cooldown 160 - 80 = 80 < 120 focus-seconds!
    expect(dev.observe(makeCheck(160))).toBe(false)

    // At t=200: cooldown 200 - 80 = 120 >= 120. span = 200 - 120 = 80 >= 40. Nudge fires!
    expect(dev.observe(makeCheck(200))).toBe(true)
  })

  it('resets evidence run on on_task, uncertain, unavailable, or paused', () => {
    const nonOffChoices: ActivityChoice[] = ['on_task', 'uncertain', 'unavailable', 'paused']

    for (const choice of nonOffChoices) {
      const policy = new NudgePolicy()

      for (const t of [0, 30, 60, 90]) {
        expect(policy.observe(makeCheck(t))).toBe(false)
      }

      // Interrupting check
      expect(policy.observe(makeCheck(120, 0.99, choice))).toBe(false)

      // Restart run at 150
      for (const t of [150, 180, 210, 240]) {
        expect(policy.observe(makeCheck(t))).toBe(false)
      }

      // At 270: span = 270 - 150 = 120s -> Nudge!
      expect(policy.observe(makeCheck(270))).toBe(true)
    }
  })

  it('stale checks (latency > maxCheckLatencySec), gaps, and out-of-order checks reset evidence', () => {
    const policy = new NudgePolicy({ maxCheckLatencySec: 45, maximumGap: 45 })

    for (const t of [0, 30, 60, 90]) {
      policy.observe(makeCheck(t))
    }

    // Stale check (latency 46s > 45s) -> resets run
    expect(policy.observe(makeCheck(120, 0.99, 'off_task', 46))).toBe(false)
    expect(policy.currentRunLength).toBe(0)

    // New check at 150
    expect(policy.observe(makeCheck(150, 0.99, 'off_task', 2))).toBe(false)

    // Huge gap: next check at 240 (gap = 90 > maximumGap 45) -> resets run and starts fresh
    expect(policy.observe(makeCheck(240, 0.99, 'off_task', 2))).toBe(false)
    expect(policy.currentRunLength).toBe(1)

    // Out of order check: t=230 <= 240 -> resets run
    expect(policy.observe(makeCheck(230, 0.99, 'off_task', 2))).toBe(false)
    expect(policy.currentRunLength).toBe(0)

    // Non-majority probability (pOff = 0.49) -> resets run
    expect(policy.observe(makeCheck(270, 0.49))).toBe(false)
    expect(policy.currentRunLength).toBe(0)
  })

  it('low overall confidence does NOT veto a majority off-task probability', () => {
    const policy = new NudgePolicy()

    // 7 checks at pOff=0.70 with low confidence=0.10
    // required for 0.70: 240 - ((0.70 - 0.5) / 0.45) * 120 = 240 - 53.33 = 186.67s
    for (let t = 0; t <= 180; t += 30) {
      expect(policy.observe(makeCheck(t, 0.70, 'off_task', 1, 0.10))).toBe(false)
    }

    // At t=210: span = 210 >= 186.67s -> Nudges despite low confidence!
    expect(policy.observe(makeCheck(210, 0.70, 'off_task', 1, 0.10))).toBe(true)
  })

  it('triggers immediately when immediate option is enabled and cooldown is satisfied', () => {
    const policy = new NudgePolicy()
    expect(policy.observe(makeCheck(10, 0.99), { immediate: true })).toBe(true)
    // Cooldown is active
    expect(policy.observe(makeCheck(20, 0.99), { immediate: true })).toBe(false)
    // Cooldown expires after 15s
    expect(policy.observe(makeCheck(30, 0.99), { immediate: true })).toBe(true)
  })
})
