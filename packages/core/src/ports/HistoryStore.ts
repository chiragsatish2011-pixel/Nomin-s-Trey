import { NotImplementedError } from './Capabilities.js'

export interface HistoryCheck {
  id: string
  elapsed: number
  activity: string
  probability: number
  probabilities?: {
    on_task?: number
    off_task?: number
    uncertain?: number
  }
  confidence: number
  nudged: boolean
}

export interface HistoryRecord {
  id: string
  task: string
  startedAt: number
  endedAt: number
  duration: number
  elapsed: number
  realElapsed: number
  usedDeveloperMode: boolean
  checks: HistoryCheck[]
}

export interface HistoryStore {
  loadHistory(): Promise<HistoryRecord[]>
  saveSession(record: HistoryRecord): Promise<void>
  clearHistory?(): Promise<void>
}

export class LinuxHistoryStore implements HistoryStore {
  async loadHistory(): Promise<HistoryRecord[]> {
    throw new NotImplementedError('HistoryStore', 'linux')
  }

  async saveSession(record: HistoryRecord): Promise<void> {
    void record
    throw new NotImplementedError('HistoryStore', 'linux')
  }
}

export class AndroidHistoryStore implements HistoryStore {
  async loadHistory(): Promise<HistoryRecord[]> {
    throw new NotImplementedError('HistoryStore', 'android')
  }

  async saveSession(record: HistoryRecord): Promise<void> {
    void record
    throw new NotImplementedError('HistoryStore', 'android')
  }
}
