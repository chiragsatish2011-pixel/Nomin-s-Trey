/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * InputSimulation port interface and cross-platform stubs.
 */

import { NotImplementedError } from './Capabilities.js'

export interface InputSimulation {
  click(physicalX: number, physicalY: number, button?: 'left' | 'right' | 'middle'): Promise<void>
  doubleClick(physicalX: number, physicalY: number): Promise<void>
  rightClick(physicalX: number, physicalY: number): Promise<void>
  move(physicalX: number, physicalY: number): Promise<void>
  typeText(text: string): Promise<void>
  pressKey(key: string, modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta' | 'win')[]): Promise<void>
  scroll(deltaY: number, deltaX?: number, physicalX?: number, physicalY?: number): Promise<void>
  drag(startX: number, startY: number, endX: number, endY: number): Promise<void>
}

export class LinuxInputSimulationStub implements InputSimulation {
  async click(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async doubleClick(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async rightClick(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async move(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async typeText(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async pressKey(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async scroll(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
  async drag(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'linux')
  }
}

export class AndroidInputSimulationStub implements InputSimulation {
  async click(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async doubleClick(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async rightClick(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async move(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async typeText(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async pressKey(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async scroll(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
  async drag(): Promise<void> {
    throw new NotImplementedError('InputSimulation', 'android')
  }
}
