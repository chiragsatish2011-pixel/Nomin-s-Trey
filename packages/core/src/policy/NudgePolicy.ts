export type ActivityChoice = 'on_task' | 'off_task' | 'uncertain' | 'unavailable' | 'paused'

export interface CheckResult {
  t: number // focus-clock elapsed seconds
  choice: ActivityChoice
  pOff: number // P(off_task) [0..1]
  pOn: number // P(on_task) [0..1]
  pUnc: number // P(uncertain) [0..1]
  confidence: number // model confidence [0..1]
  valid: boolean
  latencySec: number // real seconds taken for observation call
  error?: string // sanitized provider failure; never contains prompt or screenshot data
}

/**
 * NudgePolicy: Pure TypeScript implementation of Trey's evidence accumulation algorithm.
 *
 * ## Exact Span Equation:
 * - A check is valid only if valid=true, latencySec <= maxCheckLatencySec, choice='off_task',
 *   and pOff >= 0.5.
 * - `strength` is the arithmetic mean of `pOff` across the current contiguous evidence run.
 * - In Normal Mode (1x clock): minimum span = 120s, maximum span = 240s.
 * - In Developer Mode (4x clock): minimum span = 40s, maximum span = 80s.
 *
 * Required span in focus-clock seconds:
 *   If strength >= 0.95:
 *     required = minimum
 *   Else:
 *     required = maximum - ((strength - 0.5) / 0.45) * (maximum - minimum)
 *
 * Examples (Normal Mode):
 *   strength = 0.95 -> 120s
 *   strength = 0.50 -> 240s
 *   strength = 0.65 -> 240 - (0.15 / 0.45) * 120 = 200s (reached on next 30s check at 210s)
 *
 * ## Trigger Conditions:
 * 1. run.length >= 2 (at least 2 consecutive observations)
 * 2. (check.t - run[0].t) >= Math.max(minimum, required)
 * 3. (check.t - lastNudge) >= 120 focus-seconds (120s normal = 120s real; 120s in 4x devMode = 30s real)
 *
 * ## Difference from Swift Version:
 * - Swift reference in Shared/FocusSession.swift strictly hardcoded `age <= 20` real seconds.
 * - NVIDIA NIM models can exhibit higher latency, so `maxCheckLatencySec` is configurable,
 *   defaulting to 45s.
 */
export class NudgePolicy {
  private run: CheckResult[] = []
  private lastNudge = -Infinity
  private maximumGap: number
  private developerMode: boolean
  private maxCheckLatencySec: number

  constructor(options?: {
    maximumGap?: number
    developerMode?: boolean
    maxCheckLatencySec?: number
  }) {
    this.developerMode = options?.developerMode ?? false
    this.maximumGap = options?.maximumGap ?? (this.developerMode ? 60 : 45)
    this.maxCheckLatencySec = options?.maxCheckLatencySec ?? 45
  }

  get currentRunLength(): number {
    return this.run.length
  }

  get lastNudgeTime(): number {
    return this.lastNudge
  }

  reset(): void {
    this.run = []
  }

  onPause(): void {
    this.reset()
  }

  onEnd(): void {
    this.reset()
  }

  onLock(): void {
    this.reset()
  }

  setDeveloperMode(enabled: boolean): void {
    this.developerMode = enabled
    this.maximumGap = enabled ? 60 : 45
    this.reset()
  }

  setMaxLatency(sec: number): void {
    this.maxCheckLatencySec = Math.max(5, sec)
  }

  observe(check: CheckResult, options?: { immediate?: boolean }): boolean {
    // 1. Strict validity and staleness check
    if (
      !check.valid ||
      !Number.isFinite(check.t) ||
      !Number.isFinite(check.latencySec) ||
      check.latencySec < 0 ||
      check.latencySec > this.maxCheckLatencySec ||
      check.choice !== 'off_task' ||
      !Number.isFinite(check.pOff) ||
      check.pOff < 0.5 ||
      check.pOff > 1.0 ||
      !Number.isFinite(check.confidence) ||
      check.confidence < 0.0 ||
      check.confidence > 1.0
    ) {
      this.reset()
      return false
    }

    // 2. Monotonicity & gap check
    if (this.run.length > 0) {
      const last = this.run[this.run.length - 1]
      if (check.t <= last.t) {
        this.reset()
        return false
      }
      if (check.t - last.t > this.maximumGap) {
        // Gap exceeded: reset the run, then begin fresh with current check
        this.reset()
      }
    }

    // 3. Accumulate evidence
    this.run.push(check)

    const sumProb = this.run.reduce((acc, c) => acc + c.pOff, 0)
    const strength = sumProb / this.run.length

    const minimum = this.developerMode ? 40.0 : 120.0
    const maximum = this.developerMode ? 80.0 : 240.0

    const required =
      strength >= 0.95
        ? minimum
        : maximum - (Math.max(0, strength - 0.5) / 0.45) * (maximum - minimum)

    const span = check.t - this.run[0].t
    const cooldown = check.t - this.lastNudge

    // 4. Trigger evaluation
    const isImmediate = Boolean(options?.immediate && cooldown >= 15)
    if (
      isImmediate ||
      (this.run.length >= 2 &&
        span >= Math.max(minimum, required) &&
        cooldown >= 120)
    ) {
      this.lastNudge = check.t
      this.reset()
      return true
    }

    return false
  }
}
