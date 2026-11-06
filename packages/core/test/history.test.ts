import { describe, it, expect } from 'vitest'
import {
  LinuxHistoryStore,
  AndroidHistoryStore,
  HistoryRecord
} from '../src/index.js'

describe('HistoryStore Port & Stubs', () => {
  it('LinuxHistoryStore throws NotImplementedError', async () => {
    const store = new LinuxHistoryStore()
    await expect(store.loadHistory()).rejects.toThrow("Port 'HistoryStore' is not implemented on platform 'linux'.")
    await expect(store.saveSession({} as HistoryRecord)).rejects.toThrow("Port 'HistoryStore' is not implemented on platform 'linux'.")
  })

  it('AndroidHistoryStore throws NotImplementedError', async () => {
    const store = new AndroidHistoryStore()
    await expect(store.loadHistory()).rejects.toThrow("Port 'HistoryStore' is not implemented on platform 'android'.")
    await expect(store.saveSession({} as HistoryRecord)).rejects.toThrow("Port 'HistoryStore' is not implemented on platform 'android'.")
  })
})
