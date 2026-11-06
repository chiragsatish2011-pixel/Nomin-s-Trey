import { NotImplementedError } from './Capabilities.js'

export interface IdleMonitor {
  getIdleSeconds(): Promise<number>
}

export class LinuxIdleMonitorStub implements IdleMonitor {
  async getIdleSeconds(): Promise<number> {
    throw new NotImplementedError('IdleMonitor', 'linux')
  }
}

export class AndroidIdleMonitorStub implements IdleMonitor {
  async getIdleSeconds(): Promise<number> {
    throw new NotImplementedError('IdleMonitor', 'android')
  }
}
