import { HistoryStore, HistoryRecord, HistoryCheck } from '@bluey/core'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'

export class WindowsHistoryStore implements HistoryStore {
  private filePath: string

  constructor(customFilePath?: string) {
    if (customFilePath) {
      this.filePath = customFilePath
    } else {
      const appData = app ? app.getPath('appData') : process.env.APPDATA || '.'
      const blueyDir = join(appData, 'Bluey')
      this.filePath = join(blueyDir, 'history.json')
    }
  }

  private ensureDir(): void {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  async loadHistory(): Promise<HistoryRecord[]> {
    try {
      if (!existsSync(this.filePath)) {
        return []
      }
      const raw = readFileSync(this.filePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed as HistoryRecord[]
      }
      return []
    } catch (err) {
      console.error('Failed to load history from', this.filePath, err)
      return []
    }
  }

  async saveSession(record: HistoryRecord): Promise<void> {
    try {
      this.ensureDir()

      // Sanitize record to enforce strict privacy guarantees:
      // NEVER store images, screenshot buffers, or OCR text to disk.
      const sanitizedChecks: HistoryCheck[] = (record.checks || []).map((c) => ({
        id: c.id,
        elapsed: c.elapsed,
        activity: c.activity,
        probability: c.probability,
        probabilities: c.probabilities,
        confidence: c.confidence,
        nudged: Boolean(c.nudged)
      }))

      const sanitizedRecord: HistoryRecord = {
        id: record.id,
        task: record.task.slice(0, 500),
        startedAt: record.startedAt,
        endedAt: record.endedAt,
        duration: record.duration,
        elapsed: record.elapsed,
        realElapsed: record.realElapsed,
        usedDeveloperMode: Boolean(record.usedDeveloperMode),
        checks: sanitizedChecks
      }

      const existing = await this.loadHistory()
      // Prepend so latest session is first
      const updated = [sanitizedRecord, ...existing.filter((r) => r.id !== record.id)]

      writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to save session history to', this.filePath, err)
    }
  }

  async clearHistory(): Promise<void> {
    try {
      this.ensureDir()
      writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }
}

export const windowsHistoryStore = new WindowsHistoryStore()
