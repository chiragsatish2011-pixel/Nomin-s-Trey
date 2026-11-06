import { describe, it, expect } from 'vitest'
import { NimGovernor } from '../src/ai/NimGovernor.js'

describe('NimGovernor rate limiter & priority queue', () => {
  it('prioritizes voice and nudge wording over classification jobs in queue', async () => {
    const governor = new NimGovernor(100)
    const executed: string[] = []

    let unblock: () => void = () => {}
    const blocker = new Promise<void>((r) => {
      unblock = r
    })

    // Hold the processor with an active job
    const p0 = governor.schedule('model_refresh', async () => {
      await blocker
      executed.push('blocker')
    })

    // Queue classification (level 3) first, then voice (level 1) while queue is backed up
    const p1 = governor.schedule('classification', async () => {
      executed.push('classification')
    })

    const p2 = governor.schedule('voice', async () => {
      executed.push('voice')
    })

    // Release blocker so queue drains
    unblock()
    await Promise.all([p0, p1, p2])

    // Voice should be drained before classification!
    expect(executed).toEqual(['blocker', 'voice', 'classification'])
  })

  it('drops queued classification jobs when 429 rate limit occurs', async () => {
    const governor = new NimGovernor(100)

    let classificationRejected = false

    // Queue a failing job that encounters 429
    const failingJob = governor.schedule('classification', async () => {
      const err = new Error('Rate limit exceeded') as Error & { status: number; retryAfter?: number }
      err.status = 429
      err.retryAfter = 2 // 2 seconds
      throw err
    }).catch(() => {
      // expected
    })

    // Queue second classification job
    const queuedJob = governor.schedule('classification', async () => {
      return 'ok'
    }).catch((err) => {
      if (err.message.includes('429')) {
        classificationRejected = true
      }
    })

    await Promise.all([failingJob, queuedJob])

    expect(classificationRejected).toBe(true)
    const status = governor.getStatus()
    expect(status.state).toBe('cooling_down')
    expect(status.secondsLeft).toBeGreaterThan(0)
  })

  it('trips circuit breaker after 3 consecutive failures', async () => {
    const governor = new NimGovernor(100)

    for (let i = 0; i < 3; i++) {
      await governor.schedule('model_refresh', async () => {
        throw new Error('500 Server Error')
      }).catch(() => {})
    }

    const status = governor.getStatus()
    expect(status.state).toBe('circuit_open')
    expect(status.secondsLeft).toBeGreaterThan(0)
  })

  it('tracks local usage counter for today and this session', async () => {
    const governor = new NimGovernor(100)

    await governor.schedule('voice', async () => 'hello')
    await governor.schedule('nudge_wording', async () => 'nudge')

    const status = governor.getStatus()
    expect(status.callsThisSession).toBe(2)
    expect(status.callsToday).toBe(2)
  })
})
