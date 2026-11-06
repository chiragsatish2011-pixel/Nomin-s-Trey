export type JobPriority = 'voice' | 'research' | 'nudge_wording' | 'classification' | 'model_refresh'

export interface GovernorStatus {
  state: 'ok' | 'cooling_down' | 'circuit_open'
  secondsLeft?: number
  callsToday: number
  callsThisSession: number
}

interface QueuedJob<T> {
  id: string
  priority: JobPriority
  priorityLevel: number
  createdAt: number
  expiresAt: number
  execute: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

const PRIORITY_LEVELS: Record<JobPriority, number> = {
  voice: 1,
  research: 2,
  nudge_wording: 3,
  classification: 4,
  model_refresh: 5
}

export class NimGovernor {
  private rpmLimit: number
  private requestTimestamps: number[] = []
  private queue: QueuedJob<unknown>[] = []
  private isProcessing = false

  // 429 Cooldown
  private coolingDownUntil = 0

  // Circuit Breaker (3 consecutive failures -> 30s pause)
  private consecutiveFailures = 0
  private circuitOpenUntil = 0

  // Usage Counters
  private sessionCalls = 0
  private todayCalls = 0
  private lastCallDay = new Date().toDateString()

  private statusListener?: (status: GovernorStatus) => void

  constructor(rpmLimit = 30) {
    this.rpmLimit = rpmLimit
  }

  setRpmLimit(limit: number): void {
    this.rpmLimit = Math.max(1, limit)
  }

  onStatusChange(listener: (status: GovernorStatus) => void): void {
    this.statusListener = listener
  }

  getStatus(): GovernorStatus {
    const now = Date.now()
    this.refreshDayCounter()

    if (now < this.coolingDownUntil) {
      return {
        state: 'cooling_down',
        secondsLeft: Math.ceil((this.coolingDownUntil - now) / 1000),
        callsToday: this.todayCalls,
        callsThisSession: this.sessionCalls
      }
    }

    if (now < this.circuitOpenUntil) {
      return {
        state: 'circuit_open',
        secondsLeft: Math.ceil((this.circuitOpenUntil - now) / 1000),
        callsToday: this.todayCalls,
        callsThisSession: this.sessionCalls
      }
    }

    return {
      state: 'ok',
      callsToday: this.todayCalls,
      callsThisSession: this.sessionCalls
    }
  }

  private emitStatus(): void {
    if (this.statusListener) {
      this.statusListener(this.getStatus())
    }
  }

  private refreshDayCounter(): void {
    const currentDay = new Date().toDateString()
    if (currentDay !== this.lastCallDay) {
      this.todayCalls = 0
      this.lastCallDay = currentDay
    }
  }

  async schedule<T>(priority: JobPriority, task: () => Promise<T>): Promise<T> {
    const now = Date.now()

    // If in 429 cooldown and job is classification, drop immediately
    if (priority === 'classification' && now < this.coolingDownUntil) {
      throw new Error('NIM cooling down due to rate limit (429); classification dropped.')
    }

    return new Promise<T>((resolve, reject) => {
      const job: QueuedJob<T> = {
        id: `job-${now}-${Math.random().toString(36).slice(2, 7)}`,
        priority,
        priorityLevel: PRIORITY_LEVELS[priority],
        createdAt: now,
        // Classification jobs expire after 15 seconds if queued
        expiresAt: priority === 'classification' ? now + 15000 : Infinity,
        execute: task,
        resolve: resolve as (val: unknown) => void,
        reject
      }

      this.queue.push(job as QueuedJob<unknown>)
      // Sort by priority (ascending level) then FIFO by createdAt
      this.queue.sort((a, b) => a.priorityLevel - b.priorityLevel || a.createdAt - b.createdAt)

      this.processQueue()
    })
  }

  handleRateLimit(retryAfterSec?: number): void {
    const cooldownSec = retryAfterSec && retryAfterSec > 0 ? retryAfterSec : 60
    this.coolingDownUntil = Date.now() + cooldownSec * 1000

    // Drop all queued classification jobs
    const dropped: QueuedJob<unknown>[] = []
    this.queue = this.queue.filter((job) => {
      if (job.priority === 'classification') {
        dropped.push(job)
        return false
      }
      return true
    })

    dropped.forEach((job) => {
      job.reject(new Error(`Dropped due to HTTP 429 cooldown (${cooldownSec}s)`))
    })

    this.emitStatus()
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0
    this.sessionCalls++
    this.todayCalls++
    this.emitStatus()
  }

  private recordFailure(): void {
    this.consecutiveFailures++
    if (this.consecutiveFailures >= 3) {
      this.circuitOpenUntil = Date.now() + 30000 // 30s circuit breaker
      this.emitStatus()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const now = Date.now()

      // Drop expired jobs
      this.queue = this.queue.filter((job) => {
        if (now > job.expiresAt) {
          job.reject(new Error('Job expired in queue (>15s)'))
          return false
        }
        return true
      })

      if (this.queue.length === 0) break

      // Check cooling down
      if (now < this.coolingDownUntil) {
        // If highest priority job is classification, drop and continue
        if (this.queue[0].priority === 'classification') {
          const job = this.queue.shift()!
          job.reject(new Error('Dropped due to HTTP 429 cooldown'))
          continue
        }
      }

      // Check circuit breaker
      if (now < this.circuitOpenUntil) {
        const waitMs = this.circuitOpenUntil - now
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 500)))
        continue
      }

      // Sliding window rate limit check (requests in past 60s)
      this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000)
      if (this.requestTimestamps.length >= this.rpmLimit) {
        const oldest = this.requestTimestamps[0]
        const waitMs = 60000 - (now - oldest) + 50
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }

      const job = this.queue.shift()
      if (!job) break

      this.requestTimestamps.push(Date.now())

      try {
        const result = await job.execute()
        this.recordSuccess()
        job.resolve(result)
      } catch (err: unknown) {
        const error = err as { status?: number; statusCode?: number; retryAfter?: number }
        const code = error?.status || error?.statusCode

        if (code === 429) {
          this.handleRateLimit(error.retryAfter)
        } else {
          this.recordFailure()
        }
        job.reject(err)
      }
    }

    this.isProcessing = false
  }
}
