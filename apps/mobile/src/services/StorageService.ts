/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Secure client storage service for Trey Mobile Companion.
 */

import { PairingRecord } from '@nomin/protocol'

const PAIRING_KEY = 'trey_mobile_pairing_record'
const MODE_KEY = 'trey_mobile_active_mode'
const NIM_KEY = 'trey_mobile_nim_key'
const MODEL_KEY = 'trey_mobile_nim_model'
const THEME_KEY = 'trey_mobile_theme'

export type AppMode = 'companion' | 'standalone'
export type AppTheme = 'dark' | 'light'

const memoryStore = new Map<string, string>()

function getStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage
  }
  return {
    getItem: (k: string) => memoryStore.get(k) || null,
    setItem: (k: string, v: string) => memoryStore.set(k, v),
    removeItem: (k: string) => {
      memoryStore.delete(k)
    },
    clear: () => {
      memoryStore.clear()
    }
  }
}

export class StorageService {
  static getPairingRecord(): PairingRecord | null {
    try {
      const data = getStorage().getItem(PAIRING_KEY)
      return data ? (JSON.parse(data) as PairingRecord) : null
    } catch {
      return null
    }
  }

  static setPairingRecord(record: PairingRecord | null): void {
    if (record) {
      getStorage().setItem(PAIRING_KEY, JSON.stringify(record))
    } else {
      getStorage().removeItem(PAIRING_KEY)
    }
  }

  static getActiveMode(): AppMode {
    const mode = getStorage().getItem(MODE_KEY)
    return mode === 'standalone' ? 'standalone' : 'companion'
  }

  static setActiveMode(mode: AppMode): void {
    getStorage().setItem(MODE_KEY, mode)
  }

  static getNimApiKey(): string {
    return getStorage().getItem(NIM_KEY) || ''
  }

  static setNimApiKey(key: string): void {
    getStorage().setItem(NIM_KEY, key.trim())
  }

  static getNimModel(): string {
    return getStorage().getItem(MODEL_KEY) || 'meta/llama-3.3-70b-instruct'
  }

  static setNimModel(model: string): void {
    getStorage().setItem(MODEL_KEY, model.trim())
  }

  static getTheme(): AppTheme {
    return getStorage().getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  }

  static setTheme(theme: AppTheme): void {
    getStorage().setItem(THEME_KEY, theme)
  }

  static clearAll(): void {
    getStorage().clear()
  }
}
