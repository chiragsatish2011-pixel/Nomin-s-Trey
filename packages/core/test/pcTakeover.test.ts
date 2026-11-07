/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Unit tests for PC Takeover: ActionSchema, CoordinateMath (100%, 125%, 150%, multi-monitor),
 * and AgentLoop stop conditions with mocked NIM model.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  validateAgentStep,
  CoordinateMath,
  DisplayBounds,
  VirtualScreenBounds,
  AgentLoop,
  ScreenCapture,
  InputSimulation,
  NimClient,
  NimGovernor
} from '../src/index.js'

describe('ActionSchema Validation', () => {
  it('validates all 12 action types accurately', () => {
    const validActions = [
      { thought: 'Clicking search button', action: { type: 'click', x: 200, y: 150, button: 'left' } },
      { thought: 'Double clicking file', action: { type: 'double_click', x: 400, y: 300 } },
      { thought: 'Right clicking context menu', action: { type: 'right_click', x: 500, y: 500 } },
      { thought: 'Moving mouse', action: { type: 'move', x: 100, y: 100 } },
      { thought: 'Typing query', action: { type: 'type', text: 'Trey Agent' } },
      { thought: 'Saving file', action: { type: 'key', key: 's', modifiers: ['ctrl'] } },
      { thought: 'Scrolling down', action: { type: 'scroll', deltaY: 120, x: 500, y: 500 } },
      { thought: 'Dragging item', action: { type: 'drag', startX: 100, startY: 100, endX: 300, endY: 300 } },
      { thought: 'Waiting for render', action: { type: 'wait', durationMs: 1500 } },
      { thought: 'Taking screenshot verification', action: { type: 'screenshot' } },
      { thought: 'Completed note taking', action: { type: 'done', summary: 'Note written successfully in Notepad.' } },
      { thought: 'Need clarification', action: { type: 'ask_user', question: 'Which notebook should I use?' } }
    ]

    for (const valid of validActions) {
      const result = validateAgentStep(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.action.type).toBe(valid.action.type)
      }
    }
  })

  it('unwraps markdown json code fences seamlessly', () => {
    const raw = '```json\n{\n  "thought": "Open Notepad",\n  "action": {\n    "type": "click",\n    "x": 50,\n    "y": 1050\n  }\n}\n```'
    const result = validateAgentStep(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.thought).toBe('Open Notepad')
      expect(result.data.action.type).toBe('click')
    }
  })

  it('rejects malformed payloads and invalid action properties', () => {
    // Missing required coordinates
    const missingCoords = { thought: 'test', action: { type: 'click' } }
    expect(validateAgentStep(missingCoords).success).toBe(false)

    // Negative coordinates
    const negativeCoord = { thought: 'test', action: { type: 'click', x: -10, y: 100 } }
    expect(validateAgentStep(negativeCoord).success).toBe(false)

    // Unknown action type
    const unknownType = { thought: 'test', action: { type: 'explode' } }
    expect(validateAgentStep(unknownType).success).toBe(false)

    // Invalid JSON string
    expect(validateAgentStep('not a json').success).toBe(false)
  })
})

describe('CoordinateMath Mapping with DPI Scaling & Multi-Monitor', () => {
  it('maps coordinates accurately at 100% DPI (scaleFactor = 1.0)', () => {
    const display: DisplayBounds = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1.0 }
    const capturedSize = { width: 1024, height: 576 }

    // Center of screen
    const mapping = CoordinateMath.modelToScreenPoint({ x: 512, y: 288 }, capturedSize, display)
    expect(mapping.logicalX).toBe(960)
    expect(mapping.logicalY).toBe(540)
    expect(mapping.physicalX).toBe(960)
    expect(mapping.physicalY).toBe(540)
    expect(mapping.normalizedX).toBe(32768)
    expect(mapping.normalizedY).toBe(32768)
  })

  it('maps coordinates accurately at 125% DPI (scaleFactor = 1.25)', () => {
    const display: DisplayBounds = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1.25 }
    const capturedSize = { width: 1000, height: 1000 }

    // Click at normalized 20% x, 50% y
    const mapping = CoordinateMath.modelToScreenPoint({ x: 200, y: 500 }, capturedSize, display)
    expect(mapping.logicalX).toBe(384) // 1920 * 0.2
    expect(mapping.logicalY).toBe(540) // 1080 * 0.5
    expect(mapping.physicalX).toBe(480) // 384 * 1.25 = 480
    expect(mapping.physicalY).toBe(675) // 540 * 1.25 = 675
  })

  it('maps coordinates accurately at 150% DPI on 4K display (scaleFactor = 1.5)', () => {
    const display: DisplayBounds = { x: 0, y: 0, width: 2560, height: 1440, scaleFactor: 1.5 }
    const capturedSize = { width: 1280, height: 720 }

    const mapping = CoordinateMath.modelToScreenPoint({ x: 640, y: 360 }, capturedSize, display)
    expect(mapping.logicalX).toBe(1280)
    expect(mapping.logicalY).toBe(720)
    expect(mapping.physicalX).toBe(1920) // 2560 * 1.5 / 2
    expect(mapping.physicalY).toBe(1080) // 1440 * 1.5 / 2
  })

  it('maps coordinates accurately in a two-monitor topology with negative virtual screen offset', () => {
    // Primary display at (0, 0)
    const primaryDisplay: DisplayBounds = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1.0 }
    // Secondary display to the left at (-1920, 0)
    const secondaryDisplay: DisplayBounds = { x: -1920, y: 0, width: 1920, height: 1080, scaleFactor: 1.0 }

    const virtualScreen: VirtualScreenBounds = {
      left: -1920,
      top: 0,
      width: 3840,
      height: 1080
    }

    const capturedSize = { width: 1000, height: 1000 }

    // Click at center of secondary monitor (to the left)
    const mappingLeft = CoordinateMath.modelToScreenPoint({ x: 500, y: 500 }, capturedSize, secondaryDisplay, virtualScreen)
    expect(mappingLeft.logicalX).toBe(-960)
    expect(mappingLeft.logicalY).toBe(540)
    expect(mappingLeft.physicalX).toBe(-960)
    expect(mappingLeft.physicalY).toBe(540)

    // Normalized X across virtual desktop: (-960 - (-1920)) / 3840 = 960 / 3840 = 0.25 -> 16384
    expect(mappingLeft.normalizedX).toBe(16384)
    expect(mappingLeft.normalizedY).toBe(32768)

    // Click at center of primary monitor
    const mappingPrimary = CoordinateMath.modelToScreenPoint({ x: 500, y: 500 }, capturedSize, primaryDisplay, virtualScreen)
    expect(mappingPrimary.logicalX).toBe(960)
    expect(mappingPrimary.physicalX).toBe(960)
    // Normalized X: (960 - (-1920)) / 3840 = 2880 / 3840 = 0.75 -> 49152
    expect(mappingPrimary.normalizedX).toBe(49152)
  })
})

describe('AgentLoop Stop Conditions & Safety with Mocked Model', () => {
  function createMocks() {
    const mockClient = {
      complete: vi.fn()
    } as unknown as NimClient

    const mockGovernor = {
      schedule: vi.fn((_type, fn) => fn())
    } as unknown as NimGovernor

    const mockCapture: ScreenCapture = {
      captureDisplay: vi.fn().mockResolvedValue({
        jpeg: new Uint8Array([1, 2, 3, 4]),
        width: 1024,
        height: 768,
        scaleFactor: 1.0,
        displayId: '1'
      })
    }

    const mockInput: InputSimulation = {
      click: vi.fn().mockResolvedValue(undefined),
      doubleClick: vi.fn().mockResolvedValue(undefined),
      rightClick: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      typeText: vi.fn().mockResolvedValue(undefined),
      pressKey: vi.fn().mockResolvedValue(undefined),
      scroll: vi.fn().mockResolvedValue(undefined),
      drag: vi.fn().mockResolvedValue(undefined)
    }

    return { mockClient, mockGovernor, mockCapture, mockInput }
  }

  it('stops immediately when stop() is called mid-loop', async () => {
    const { mockClient, mockGovernor, mockCapture, mockInput } = createMocks()
    const loop = new AgentLoop(mockClient, mockGovernor, mockCapture, mockInput)

    ;(mockClient.complete as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      // Simulate user emergency abort during thinking
      loop.stop()
      return {
        text: JSON.stringify({
          thought: 'Clicking start menu',
          action: { type: 'click', x: 20, y: 980 }
        }),
        modelUsed: 'mock-model'
      }
    })

    const result = await loop.run({
      task: 'Open Notepad',
      maxSteps: 10,
      display: { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 }
    })

    expect(result.success).toBe(false)
    expect(result.summary).toContain('stopped by user or safety trigger')
    expect(mockInput.click).not.toHaveBeenCalled()
  })

  it('detects infinite action loop when model repeats identical action 3 times', async () => {
    const { mockClient, mockGovernor, mockCapture, mockInput } = createMocks()
    const loop = new AgentLoop(mockClient, mockGovernor, mockCapture, mockInput)

    const repeatedAction = JSON.stringify({
      thought: 'Clicking retry button',
      action: { type: 'click', x: 500, y: 400 }
    })

    ;(mockClient.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: repeatedAction,
      modelUsed: 'mock-model'
    })

    const onAskUser = vi.fn().mockResolvedValue('Try refreshing the page instead')

    await loop.run({
      task: 'Download file',
      maxSteps: 6,
      display: { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 },
      onAskUser
    })

    // Third identical action must trigger onAskUser
    expect(onAskUser).toHaveBeenCalled()
  })

  it('caps execution at maxSteps if task is not marked done', async () => {
    const { mockClient, mockGovernor, mockCapture, mockInput } = createMocks()
    const loop = new AgentLoop(mockClient, mockGovernor, mockCapture, mockInput)

    let stepCount = 0
    ;(mockClient.complete as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      stepCount++
      return {
        text: JSON.stringify({
          thought: `Looking around step ${stepCount}`,
          action: { type: 'move', x: stepCount * 50, y: stepCount * 50 }
        }),
        modelUsed: 'mock-model'
      }
    })

    const result = await loop.run({
      task: 'Explore screen',
      maxSteps: 4,
      display: { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 }
    })

    expect(result.success).toBe(false)
    expect(result.summary).toContain('maximum step limit (4)')
    expect(result.stepsExecuted).toBe(4)
  })

  it('requires confirmation before executing sensitive or destructive actions', async () => {
    const { mockClient, mockGovernor, mockCapture, mockInput } = createMocks()
    const loop = new AgentLoop(mockClient, mockGovernor, mockCapture, mockInput)

    ;(mockClient.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: JSON.stringify({
        thought: 'Typing sensitive credentials',
        action: { type: 'type', text: 'my_secret_password_123' }
      }),
      modelUsed: 'mock-model'
    })

    // User rejects confirmation
    const onRequestConfirmation = vi.fn().mockResolvedValue(false)

    const result = await loop.run({
      task: 'Login to portal',
      maxSteps: 3,
      display: { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 },
      onRequestConfirmation
    })

    expect(onRequestConfirmation).toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(result.summary).toContain('User cancelled potentially sensitive action')
    expect(mockInput.typeText).not.toHaveBeenCalled()
  })
})
