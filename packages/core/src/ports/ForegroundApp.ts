import { NotImplementedError } from './Capabilities.js'

export interface ForegroundAppInfo {
  processName: string
  processId?: number
  windowTitle: string
}

export interface ForegroundApp {
  getForegroundApp(): Promise<ForegroundAppInfo>
}

export class LinuxForegroundAppStub implements ForegroundApp {
  async getForegroundApp(): Promise<ForegroundAppInfo> {
    throw new NotImplementedError('ForegroundApp', 'linux')
  }
}

export class AndroidForegroundAppStub implements ForegroundApp {
  async getForegroundApp(): Promise<ForegroundAppInfo> {
    throw new NotImplementedError('ForegroundApp', 'android')
  }
}
