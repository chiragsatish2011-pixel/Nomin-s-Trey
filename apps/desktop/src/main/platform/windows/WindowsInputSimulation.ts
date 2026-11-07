/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Windows native input simulation using TreyInputHelper resident bridge.
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import type { InputSimulation } from '@nomin/core'

export class WindowsInputSimulation implements InputSimulation {
  private process: ChildProcess | null = null
  private isReady = false
  private readyPromise: Promise<void> | null = null
  private pendingQueue: Array<{
    cmd: string
    resolve: () => void
    reject: (err: Error) => void
  }> = []
  private activeRequest: {
    resolve: () => void
    reject: (err: Error) => void
  } | null = null
  private responseBuffer = ''

  constructor() {
    this.readyPromise = this.ensureProcess()
  }

  private getHelperPath(): string {
    const isDev = !app || !app.isPackaged
    if (isDev) {
      return join(process.cwd(), 'apps/desktop/resources/bin/TreyInputHelper.exe')
    }
    return join(process.resourcesPath, 'bin/TreyInputHelper.exe')
  }

  private async ensureProcess(): Promise<void> {
    if (this.process && this.isReady) return

    const exePath = this.getHelperPath()
    if (!existsSync(exePath)) {
      console.warn(`[WindowsInputSimulation] Helper executable not found at ${exePath}. Input simulation will fail.`)
      return
    }

    return new Promise<void>((resolve) => {
      try {
        this.process = spawn(exePath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        })

        this.process.stdout?.on('data', (chunk: Buffer) => {
          this.responseBuffer += chunk.toString('utf8')
          this.processResponseBuffer()
        })

        this.process.stderr?.on('data', (chunk: Buffer) => {
          console.error(`[WindowsInputSimulation stderr]:`, chunk.toString('utf8'))
        })

        this.process.on('close', () => {
          this.isReady = false
          this.process = null
          if (this.activeRequest) {
            this.activeRequest.reject(new Error('Input helper process closed unexpectedly.'))
            this.activeRequest = null
          }
        })

        // Await READY line from stdout
        const checkReady = (): void => {
          if (this.responseBuffer.includes('READY')) {
            this.isReady = true
            this.responseBuffer = this.responseBuffer.replace('READY', '').trim()
            resolve()
          } else {
            setTimeout(checkReady, 50)
          }
        }
        checkReady()
      } catch (err) {
        console.error('[WindowsInputSimulation] Failed to spawn input helper:', err)
        resolve()
      }
    })
  }

  private processResponseBuffer(): void {
    const lines = this.responseBuffer.split('\n')
    while (lines.length > 1) {
      const line = lines.shift()!.trim()
      if (line === 'OK') {
        if (this.activeRequest) {
          const req = this.activeRequest
          this.activeRequest = null
          req.resolve()
        }
      } else if (line.startsWith('ERROR:')) {
        if (this.activeRequest) {
          const req = this.activeRequest
          this.activeRequest = null
          req.reject(new Error(line))
        }
      }
    }
    this.responseBuffer = lines.join('\n')

    // Dispatch next pending command
    if (!this.activeRequest && this.pendingQueue.length > 0) {
      const next = this.pendingQueue.shift()!
      this.activeRequest = { resolve: next.resolve, reject: next.reject }
      this.process?.stdin?.write(`${next.cmd}\n`)
    }
  }

  private async execute(cmd: string): Promise<void> {
    await this.readyPromise
    if (!this.process || !this.isReady) {
      await this.ensureProcess()
    }

    if (!this.process || !this.isReady) {
      throw new Error('Input helper process is not available.')
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.activeRequest) {
        this.activeRequest = { resolve, reject }
        this.process?.stdin?.write(`${cmd}\n`)
      } else {
        this.pendingQueue.push({ cmd, resolve, reject })
      }
    })
  }

  async click(physicalX: number, physicalY: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.execute(`click ${Math.round(physicalX)} ${Math.round(physicalY)} ${button}`)
  }

  async doubleClick(physicalX: number, physicalY: number): Promise<void> {
    await this.execute(`double_click ${Math.round(physicalX)} ${Math.round(physicalY)}`)
  }

  async rightClick(physicalX: number, physicalY: number): Promise<void> {
    await this.execute(`right_click ${Math.round(physicalX)} ${Math.round(physicalY)}`)
  }

  async move(physicalX: number, physicalY: number): Promise<void> {
    await this.execute(`move ${Math.round(physicalX)} ${Math.round(physicalY)}`)
  }

  async typeText(text: string): Promise<void> {
    await this.execute(`type ${text}`)
  }

  async pressKey(key: string, modifiers: ('ctrl' | 'alt' | 'shift' | 'meta' | 'win')[] = []): Promise<void> {
    const modsStr = modifiers.join(',')
    await this.execute(`key ${key} ${modsStr}`)
  }

  async scroll(deltaY: number, deltaX = 0, physicalX?: number, physicalY?: number): Promise<void> {
    if (physicalX !== undefined && physicalY !== undefined) {
      await this.execute(`scroll ${Math.round(deltaY)} ${Math.round(deltaX)} ${Math.round(physicalX)} ${Math.round(physicalY)}`)
    } else {
      await this.execute(`scroll ${Math.round(deltaY)} ${Math.round(deltaX)}`)
    }
  }

  async drag(startX: number, startY: number, endX: number, endY: number): Promise<void> {
    await this.execute(`drag ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)}`)
  }

  dispose(): void {
    if (this.process) {
      try {
        this.process.stdin?.write('exit\n')
        this.process.kill()
      } catch {
        // ignore
      }
      this.process = null
      this.isReady = false
    }
  }
}

export const windowsInputSimulation = new WindowsInputSimulation()
