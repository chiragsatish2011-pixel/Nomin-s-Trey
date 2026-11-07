import { execFile } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'
import type { ForegroundApp, ForegroundAppInfo } from '@nomin/core'

const execFileAsync = promisify(execFile)

export class WindowsForegroundApp implements ForegroundApp {
  private scriptPath: string

  constructor(scriptPath?: string) {
    this.scriptPath = scriptPath || join(__dirname, 'getForeground.ps1')
  }

  async getForegroundApp(): Promise<ForegroundAppInfo> {
    try {
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath],
        { timeout: 3000 }
      )

      const parsed = JSON.parse(stdout.trim())
      return {
        processName: parsed.process || 'unknown',
        processId: parsed.pid || undefined,
        windowTitle: parsed.title || ''
      }
    } catch {
      return {
        processName: 'unknown',
        windowTitle: ''
      }
    }
  }
}

export const windowsForegroundApp = new WindowsForegroundApp()
