import { CheckResult } from '../policy/NudgePolicy.js'

export interface ClassificationInput {
  task: string
  realActiveElapsed: number
  elapsed: number
  clockRate: number
  idleSeconds: number
  recentHistory: string
  foregroundApp?: string
  screenText: string
  jpegBase64: string
}

export interface ClassificationOutput {
  choice: 'on_task' | 'off_task' | 'uncertain'
  p_off_task: number
  p_on_task: number
  p_uncertain: number
  confidence: number
  rawText?: string
}

export interface NudgeCandidateTarget {
  id: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
}

export interface NudgeInput {
  task: string
  targetsList: string
  jpegBase64: string
}

export interface NudgeOutput {
  message: string
  targetId: string | null
  targetQuote: string | null
}

export interface VisionProvider {
  classify(input: ClassificationInput): Promise<CheckResult>
  generateNudge(input: NudgeInput): Promise<NudgeOutput>
  listVisionModels(): Promise<string[]>
}
