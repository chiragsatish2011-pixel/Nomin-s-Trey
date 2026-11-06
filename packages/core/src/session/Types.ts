import { z } from 'zod'

export const FocusActivitySchema = z.enum([
  'on_task',
  'off_task',
  'uncertain',
  'unavailable',
  'paused'
])

export type FocusActivity = z.infer<typeof FocusActivitySchema>

export interface FocusCheck {
  id: string
  elapsed: number
  activity: FocusActivity
  probability: number
  confidence: number
  probabilities?: Record<string, number>
  sampleDuration?: number
  nudged: boolean
}

export type FocusSessionStatus = 'running' | 'paused' | 'ended'

export interface FocusSession {
  id: string
  task: string
  duration: number
  startedAt: number
  elapsed: number
  status: FocusSessionStatus
  detail: string
  checks: FocusCheck[]
  developerMode?: boolean
  usedDeveloperMode?: boolean
  realElapsed?: number
}

export interface FocusSync {
  current?: FocusSession
  history: FocusSession[]
  revision: number
  sentAt: number
  developerMode?: boolean
}
