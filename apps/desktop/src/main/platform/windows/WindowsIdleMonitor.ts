import { powerMonitor } from 'electron'
import type { IdleMonitor } from '@nomin/core'

export class WindowsIdleMonitor implements IdleMonitor {
  async getIdleSeconds(): Promise<number> {
    try {
      return powerMonitor.getSystemIdleTime()
    } catch {
      return 0
    }
  }
}

export const windowsIdleMonitor = new WindowsIdleMonitor()
