/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Strongly-typed action schema for PC takeover agent using Zod.
 */

import { z } from 'zod'

export const ClickActionSchema = z.object({
  type: z.literal('click'),
  x: z.number().min(0),
  y: z.number().min(0),
  button: z.enum(['left', 'right', 'middle']).default('left').optional(),
  description: z.string().optional()
})

export const DoubleClickActionSchema = z.object({
  type: z.literal('double_click'),
  x: z.number().min(0),
  y: z.number().min(0),
  description: z.string().optional()
})

export const RightClickActionSchema = z.object({
  type: z.literal('right_click'),
  x: z.number().min(0),
  y: z.number().min(0),
  description: z.string().optional()
})

export const MoveActionSchema = z.object({
  type: z.literal('move'),
  x: z.number().min(0),
  y: z.number().min(0),
  description: z.string().optional()
})

export const TypeActionSchema = z.object({
  type: z.literal('type'),
  text: z.string(),
  description: z.string().optional()
})

export const KeyActionSchema = z.object({
  type: z.literal('key'),
  key: z.string().min(1),
  modifiers: z.array(z.enum(['ctrl', 'alt', 'shift', 'meta', 'win'])).default([]).optional(),
  description: z.string().optional()
})

export const ScrollActionSchema = z.object({
  type: z.literal('scroll'),
  deltaY: z.number(),
  deltaX: z.number().default(0).optional(),
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
  description: z.string().optional()
})

export const DragActionSchema = z.object({
  type: z.literal('drag'),
  startX: z.number().min(0),
  startY: z.number().min(0),
  endX: z.number().min(0),
  endY: z.number().min(0),
  description: z.string().optional()
})

export const WaitActionSchema = z.object({
  type: z.literal('wait'),
  durationMs: z.number().min(100).max(10000).default(1000).optional(),
  description: z.string().optional()
})

export const ScreenshotActionSchema = z.object({
  type: z.literal('screenshot'),
  description: z.string().optional()
})

export const DoneActionSchema = z.object({
  type: z.literal('done'),
  summary: z.string().min(1)
})

export const AskUserActionSchema = z.object({
  type: z.literal('ask_user'),
  question: z.string().min(1)
})

export const AgentActionSchema = z.discriminatedUnion('type', [
  ClickActionSchema,
  DoubleClickActionSchema,
  RightClickActionSchema,
  MoveActionSchema,
  TypeActionSchema,
  KeyActionSchema,
  ScrollActionSchema,
  DragActionSchema,
  WaitActionSchema,
  ScreenshotActionSchema,
  DoneActionSchema,
  AskUserActionSchema
])

export type AgentAction = z.infer<typeof AgentActionSchema>

export const AgentStepResponseSchema = z.object({
  thought: z.string().min(1),
  action: AgentActionSchema,
  isDestructive: z.boolean().default(false).optional()
})

export type AgentStepResponse = z.infer<typeof AgentStepResponseSchema>

/**
 * Validates and safely parses model output text into an AgentStepResponse.
 * Returns null if the payload is malformed or invalid.
 */
export function validateAgentStep(rawInput: unknown): { success: true; data: AgentStepResponse } | { success: false; error: string } {
  let target = rawInput
  if (typeof rawInput === 'string') {
    try {
      // Strip markdown JSON code fence blocks if present
      const cleanJson = rawInput.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim()
      target = JSON.parse(cleanJson)
    } catch (err) {
      return { success: false, error: `Invalid JSON syntax: ${String(err)}` }
    }
  }

  const result = AgentStepResponseSchema.safeParse(target)
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
    return { success: false, error: `Schema validation failed: ${errorMsg}` }
  }

  return { success: true, data: result.data }
}
