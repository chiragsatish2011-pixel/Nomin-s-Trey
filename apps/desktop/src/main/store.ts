import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

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
  hotkeyPause: 'CommandOrControl+2',
  hotkeyVoice: 'CommandOrControl+1',
  autoStartOnLogin: false,
  startMinimizedToTray: false
}

function getSettingsPath(): string {
  const dir = app ? app.getPath('userData') : '.'
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'settings.json')
}

export function loadSettings(): AppSettings {
  try {
    const p = getSettingsPath()
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf8'))
      const merged = { ...defaultSettings, ...data }
      // Auto-migrate retired models
      if (
        !merged.model ||
        merged.model.includes('llama-3.2-11b') ||
        merged.model.includes('llama-3.2-90b')
      ) {
        merged.model = defaultSettings.model
        merged.fallbackModels = defaultSettings.fallbackModels
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
    const p = getSettingsPath()
    writeFileSync(p, JSON.stringify(updated, null, 2), 'utf8')
    return updated
  } catch (err) {
    console.error('Failed to save settings:', err)
    return loadSettings()
  }
}
