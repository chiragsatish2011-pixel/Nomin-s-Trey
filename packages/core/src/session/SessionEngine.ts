import {
  FocusCheck,
  FocusSession,
  FocusSessionStatus
} from './Types.js'

export class SessionEngine {
  private session: FocusSession | null = null
  private endTime = 0
  private remainingAtPause = 0

  constructor(session?: FocusSession) {
    if (session) {
      this.session = session
      this.remainingAtPause = Math.max(0, session.duration - session.elapsed)
      const rate = session.developerMode ? 4 : 1
      this.endTime = Date.now() + (this.remainingAtPause / rate) * 1000
    }
  }

  static formatClock(seconds: number): string {
    const n = Math.max(0, Math.ceil(seconds))
    const mins = Math.floor(n / 60)
    const secs = n % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  start(task: string, durationSeconds = 1800, developerMode = false, now = Date.now()): FocusSession {
    const trimmedTask = task.trim().slice(0, 500)
    // Clamp duration between 60s (1 min) and 14400s (240 min)
    const clampedDuration = Math.min(14400, Math.max(60, durationSeconds))

    const checkInterval = developerMode ? 10 : 30
    this.session = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${now}`,
      task: trimmedTask,
      duration: clampedDuration,
      startedAt: now,
      elapsed: 0,
      status: 'running',
      detail: `First check in ${checkInterval} seconds`,
      checks: [],
      developerMode,
      usedDeveloperMode: developerMode,
      realElapsed: 0
    }
    const rate = developerMode ? 4 : 1
    this.remainingAtPause = clampedDuration
    this.endTime = now + (clampedDuration / rate) * 1000
    return this.getSession()!
  }

  getSession(): FocusSession | null {
    return this.session ? { ...this.session, checks: [...this.session.checks] } : null
  }

  recordCheck(check: FocusCheck, detail: string): void {
    if (!this.session || this.session.status !== 'running') return
    this.session.checks.push(check)
    this.session.detail = detail
  }

  setDetail(detail: string): void {
    if (!this.session) return
    this.session.detail = detail
  }

  get status(): FocusSessionStatus | 'idle' {
    return this.session ? this.session.status : 'idle'
  }

  get isDeveloperMode(): boolean {
    return this.session?.developerMode === true
  }

  get clockRate(): number {
    return this.isDeveloperMode ? 4 : 1
  }

  get checkInterval(): number {
    return this.isDeveloperMode ? 10 : 30
  }

  get observationDuration(): number {
    return this.checkInterval * this.clockRate
  }

  get realActiveElapsed(): number {
    if (!this.session) return 0
    return this.session.realElapsed ?? this.session.elapsed
  }

  get remaining(): number {
    if (!this.session) return 0
    return Math.max(0, this.session.duration - this.session.elapsed)
  }

  get endTimeMs(): number {
    return this.endTime
  }

  syncClock(now = Date.now()): void {
    if (!this.session || this.session.status !== 'running') return
    const rate = this.clockRate
    const remainingFocusSec = Math.max(0, (this.endTime - now) / 1000) * rate
    const clampedRemaining = Math.min(this.session.duration, remainingFocusSec)

    const elapsedFocusSec = Math.max(0, this.session.duration - clampedRemaining)
    this.session.elapsed = elapsedFocusSec
    this.session.realElapsed = elapsedFocusSec / rate
    this.remainingAtPause = clampedRemaining

    if (clampedRemaining <= 0) {
      this.session.status = 'ended'
      this.session.detail = "Time's up. Lovely bit of focus."
    }
  }

  advance(seconds: number): void {
    if (!this.session || this.session.status !== 'running') return
    if (!Number.isFinite(seconds) || seconds <= 0) return

    const remainingFocus = this.remaining
    const rate = this.clockRate

    this.session.realElapsed = this.realActiveElapsed + Math.min(seconds, remainingFocus / rate)
    this.session.elapsed = Math.min(this.session.duration, this.session.elapsed + seconds * rate)
    this.remainingAtPause = Math.max(0, this.session.duration - this.session.elapsed)
    this.endTime = Date.now() + (this.remainingAtPause / rate) * 1000

    if (this.session.elapsed >= this.session.duration) {
      this.session.status = 'ended'
      this.session.detail = "Time's up. Lovely bit of focus."
    }
  }

  pause(reason = 'Paused', now = Date.now()): void {
    if (!this.session || this.session.status !== 'running') return
    this.session.status = 'paused'
    this.session.detail = reason
    this.remainingAtPause = Math.max(0, this.session.duration - this.session.elapsed)

    const pauseCheck: FocusCheck = {
      id: `check-${now}-${this.session.checks.length}`,
      elapsed: this.session.elapsed,
      activity: 'paused',
      probability: 0,
      confidence: 0,
      nudged: false
    }
    this.session.checks.push(pauseCheck)
  }

  resume(now = Date.now()): void {
    if (!this.session || this.session.status !== 'paused') return
    this.session.status = 'running'
    const rate = this.clockRate
    this.endTime = now + (this.remainingAtPause / rate) * 1000
    this.session.detail = `Resumed. Next check in ${this.checkInterval} seconds`
  }

  setDeveloperMode(enabled: boolean, now = Date.now()): void {
    if (!this.session) return
    this.session.developerMode = enabled
    if (enabled) {
      this.session.usedDeveloperMode = true
    }
    const currentRemaining = Math.max(0, this.session.duration - this.session.elapsed)
    this.remainingAtPause = currentRemaining
    const newRate = this.clockRate
    this.endTime = now + (currentRemaining / newRate) * 1000
  }

  end(): void {
    if (!this.session || this.session.status === 'ended') return
    this.session.status = 'ended'
    this.session.detail = 'Session finished'
  }
}
