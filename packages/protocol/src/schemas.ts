/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Strongly-typed wire protocol and message schemas for Trey Desktop and Mobile Companion.
 */

import { z } from 'zod'

export const PROTOCOL_VERSION = 1

export const TreyMoodSchema = z.enum([
  'listening',
  'talking',
  'pointing',
  'thinking',
  'happy',
  'resting',
  'sleepy'
])
export type TreyMood = z.infer<typeof TreyMoodSchema>

export const FocusActivitySchema = z.enum([
  'on_task',
  'off_task',
  'uncertain',
  'unavailable',
  'paused'
])
export type FocusActivity = z.infer<typeof FocusActivitySchema>

export const FocusCheckSchema = z.object({
  id: z.string(),
  elapsed: z.number(),
  activity: FocusActivitySchema,
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  probabilities: z
    .object({
      on_task: z.number().min(0).max(1).optional(),
      off_task: z.number().min(0).max(1).optional(),
      uncertain: z.number().min(0).max(1).optional()
    })
    .optional(),
  sampleDuration: z.number().optional(),
  nudged: z.boolean().optional()
})
export type FocusCheck = z.infer<typeof FocusCheckSchema>

export const FocusSessionStateSchema = z.object({
  id: z.string(),
  task: z.string(),
  duration: z.number(),
  elapsed: z.number(),
  realElapsed: z.number().optional(),
  status: z.enum(['running', 'paused', 'ended']),
  detail: z.string(),
  usedDeveloperMode: z.boolean().optional(),
  developerMode: z.boolean().optional(),
  checks: z.array(FocusCheckSchema)
})
export type FocusSessionState = z.infer<typeof FocusSessionStateSchema>

export const PairingRecordSchema = z.object({
  version: z.literal(PROTOCOL_VERSION),
  service: z.string().min(1),
  secret: z.string().min(32), // base64-encoded 32-byte secret
  port: z.number().int().min(1024).max(65535),
  addresses: z.array(z.string()).default([]),
  expiresAt: z.number() // Timestamp in milliseconds
})
export type PairingRecord = z.infer<typeof PairingRecordSchema>

export function formatQrText(record: PairingRecord): string {
  const json = JSON.stringify(record)
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(json, 'utf8').toString('base64')
    : btoa(unescape(encodeURIComponent(json)))
  return `trey-pair:${base64}`
}

export function parseQrText(text: string): PairingRecord | null {
  if (!text || !text.startsWith('trey-pair:')) return null
  try {
    const rawBase64 = text.slice('trey-pair:'.length)
    const jsonStr = typeof Buffer !== 'undefined'
      ? Buffer.from(rawBase64, 'base64').toString('utf8')
      : decodeURIComponent(escape(atob(rawBase64)))
    const parsed = JSON.parse(jsonStr)
    const record = PairingRecordSchema.parse(parsed)
    // Validate expiration
    if (Date.now() > record.expiresAt) {
      return null
    }
    return record
  } catch {
    return null
  }
}

// Wire Packets
export const HeartbeatPacketSchema = z.object({
  type: z.literal('heartbeat'),
  timestamp: z.number(),
  uptime: z.number()
})

export const AuthPacketSchema = z.object({
  type: z.literal('auth'),
  deviceId: z.string().min(1),
  deviceName: z.string().min(1)
})

export const StateSyncPacketSchema = z.object({
  type: z.literal('state'),
  revision: z.number().int().nonnegative(),
  current: FocusSessionStateSchema.optional(),
  history: z.array(FocusSessionStateSchema).default([]),
  developerMode: z.boolean().default(false),
  takeoverActive: z.boolean().default(false),
  takeoverStep: z
    .object({
      stepNumber: z.number(),
      thought: z.string(),
      actionDescription: z.string()
    })
    .optional(),
  sentAt: z.number()
})

export const TaskStartPacketSchema = z.object({
  type: z.literal('task_start'),
  task: z.string().min(1).max(500),
  durationMinutes: z.number().min(1).max(240).default(30),
  developerMode: z.boolean().optional(),
  mode: z.enum(['focus', 'takeover']).default('focus')
})

export const TaskStepPacketSchema = z.object({
  type: z.literal('task_step'),
  step: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive().optional(),
  thought: z.string(),
  actionDescription: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'paused'])
})

export const TaskResultPacketSchema = z.object({
  type: z.literal('task_result'),
  success: z.boolean(),
  summary: z.string(),
  stepsExecuted: z.number().int().nonnegative()
})

export const StopPacketSchema = z.object({
  type: z.literal('stop'),
  reason: z.string().default('User emergency stop'),
  timestamp: z.number()
})

export const FacePacketSchema = z.object({
  type: z.literal('face'),
  gazeX: z.number().min(-1).max(1),
  gazeY: z.number().min(-1).max(1),
  mood: TreyMoodSchema,
  talk: z.number().min(0).max(1)
})

export const NudgePacketSchema = z.object({
  type: z.literal('nudge'),
  text: z.string(),
  timestamp: z.number()
})

export const ErrorPacketSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string()
})

export const WirePacketSchema = z.discriminatedUnion('type', [
  HeartbeatPacketSchema,
  AuthPacketSchema,
  StateSyncPacketSchema,
  TaskStartPacketSchema,
  TaskStepPacketSchema,
  TaskResultPacketSchema,
  StopPacketSchema,
  FacePacketSchema,
  NudgePacketSchema,
  ErrorPacketSchema
])
export type WirePacket = z.infer<typeof WirePacketSchema>

export const WireEnvelopeSchema = z.object({
  sequence: z.number().int().nonnegative(),
  packet: WirePacketSchema
})
export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>
