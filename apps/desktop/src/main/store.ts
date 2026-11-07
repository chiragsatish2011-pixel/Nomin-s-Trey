import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'

export interface PairedDeviceRecord {
  id: string
  name: string
  fingerprint: string
  secretBase64: string
  pairedAt: number
  revoked: boolean
}

export interface AppSettings {
  facePosition?: { x: number; y: number }
  faceSize?: { width: number; height: number }
  developerMode: boolean
  expression: string
  provider?: 'nim' | 'openai' | 'openrouter' | 'groq' | 'custom'
  baseUrl?: string
  model: string
  fallbackModels: string[]
  checkIntervalSec: number
  rpmLimit: number
  maxCheckLatencySec: number
  monitorChoice: 'primary' | 'all'
  hotkeyPause: string
  hotkeyVoice: string
  autoStartOnLogin?: boolean
  startMinimizedToTray?: boolean
  pairedDevices?: PairedDeviceRecord[]
}

const defaultSettings: AppSettings = {
  developerMode: false,
  expression: 'idle',
  provider: 'nim',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  fallbackModels: ['nvidia/nemotron-3.5-lightning-30b-a3b'],
  checkIntervalSec: 30,
  rpmLimit: 30,
  maxCheckLatencySec: 45,
  monitorChoice: 'primary',
  hotkeyPause: 'CommandOrControl+K',
  hotkeyVoice: 'CommandOrControl+J',
  autoStartOnLogin: false,
  startMinimizedToTray: false
}

function getSettingsPath(): string {
  const appData = app ? app.getPath('appData') : process.env.APPDATA || '.'
  const treyDir = join(appData, 'Trey')
  if (!existsSync(treyDir)) {
    mkdirSync(treyDir, { recursive: true })
  }
  const treySettings = join(treyDir, 'settings.json')
  // One-time legacy migration from @bluey/desktop/settings.json
  if (!existsSync(treySettings)) {
    const legacyCandidates = [
      join(appData, '@bluey', 'desktop', 'settings.json'),
      join(appData, 'Bluey', 'settings.json')
    ]
    for (const legacy of legacyCandidates) {
      if (existsSync(legacy)) {
        try {
          copyFileSync(legacy, treySettings)
          break
        } catch {
          // ignore
        }
      }
    }
  }
  return treySettings
}

export function loadSettings(): AppSettings {
  try {
    const p = getSettingsPath()
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf8'))
      const merged = { ...defaultSettings, ...data }
      // Requirement 5: Developer Mode must default to OFF and never persist across restarts
      merged.developerMode = false
      // Auto-migrate retired or stalled models
      if (
        !merged.model ||
        merged.model.includes('llama-3.2-11b') ||
        merged.model.includes('llama-3.2-90b')
      ) {
        merged.model = defaultSettings.model
        merged.fallbackModels = defaultSettings.fallbackModels
      }
      if (Array.isArray(merged.fallbackModels)) {
        merged.fallbackModels = merged.fallbackModels.filter(
          (m: string) =>
            !m.includes('llama-3.2-90b') &&
            !m.includes('llama-3.2-11b') &&
            !m.includes('embed') &&
            !m.includes('retriever')
        )
        if (merged.fallbackModels.length === 0) {
          merged.fallbackModels = defaultSettings.fallbackModels
        }
      }
      return merged
    }
  } catch (err) {
    console.error('Failed to load settings:', err)
  }
  return { ...defaultSettings }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = loadSettings()
    const updated = { ...current, ...settings }
    // Requirement 5: Never persist developerMode to disk across restarts
    const toWrite = { ...updated, developerMode: false }
    const p = getSettingsPath()
    writeFileSync(p, JSON.stringify(toWrite, null, 2), 'utf8')
    return { ...updated, developerMode: settings.developerMode ?? false }
  } catch (err) {
    console.error('Failed to save settings:', err)
    return loadSettings()
  }
}
