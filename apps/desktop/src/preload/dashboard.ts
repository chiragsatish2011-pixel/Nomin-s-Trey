import { contextBridge, ipcRenderer } from 'electron'

export interface PerceptionDebugData {
  imageDataUrl: string
  lines: { id: string; text: string; rect: { x: number; y: number; width: number; height: number } }[]
  app: { processName: string; windowTitle: string }
  idleSeconds: number
}

export interface DashboardAPI {
  onSync: (callback: (state: unknown) => void) => () => void
  onCursorMoved: (callback: (payload: { x: number; y: number; faceX: number; faceY: number; width?: number; height?: number }) => void) => () => void
  onExpressionChanged: (callback: (expression: string) => void) => () => void
  startFocus: (task: string, minutes: number) => Promise<string>
  pauseFocus: () => Promise<string>
  resumeFocus: () => Promise<string>
  endFocus: () => Promise<string>
  setDeveloperMode: (enabled: boolean) => Promise<string>
  testNudge: () => Promise<string>
  getHistory: () => Promise<unknown[]>
  clearHistory: () => Promise<void>
  captureNow: () => Promise<PerceptionDebugData>
  saveApiKey: (key: string) => Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }>
  hasApiKey: () => Promise<boolean>
  getKeyMasked: () => Promise<string | null>
  testApiKey: (key?: string) => Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }>
  removeApiKey: () => Promise<boolean>
  listModels: () => Promise<string[]>
  getGovernorStatus: () => Promise<unknown>
  getSettings: () => Promise<unknown>
  saveSettings: (settings: unknown) => Promise<void>
  setAlwaysOnTop: (pinned: boolean) => Promise<boolean>
  isAlwaysOnTop: () => Promise<boolean>
  toggleFloatingBuddy: (show: boolean) => Promise<boolean>
  isFloatingBuddyVisible: () => Promise<boolean>
  queryResearch: (question: string) => Promise<unknown>
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

const dashboardAPI: DashboardAPI = {
  onSync: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state)
    ipcRenderer.on('focus:sync', handler)
    return () => {
      ipcRenderer.removeListener('focus:sync', handler)
    }
  },
  onCursorMoved: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { x: number; y: number; faceX: number; faceY: number; width?: number; height?: number }) => callback(payload)
    ipcRenderer.on('cursor:moved', handler)
    return () => {
      ipcRenderer.removeListener('cursor:moved', handler)
    }
  },
  onExpressionChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, expression: string) => callback(expression)
    ipcRenderer.on('face:expression', handler)
    return () => {
      ipcRenderer.removeListener('face:expression', handler)
    }
  },
  startFocus: (task, minutes) => ipcRenderer.invoke('focus:start', { task, minutes }),
  pauseFocus: () => ipcRenderer.invoke('focus:pause'),
  resumeFocus: () => ipcRenderer.invoke('focus:resume'),
  endFocus: () => ipcRenderer.invoke('focus:end'),
  setDeveloperMode: (enabled) => ipcRenderer.invoke('focus:developerMode', enabled),
  testNudge: () => ipcRenderer.invoke('focus:testNudge'),
  getHistory: () => ipcRenderer.invoke('focus:getHistory'),
  clearHistory: () => ipcRenderer.invoke('focus:clearHistory'),
  captureNow: () => ipcRenderer.invoke('perception:captureNow'),
  saveApiKey: (key) => ipcRenderer.invoke('ai:saveKey', key),
  hasApiKey: () => ipcRenderer.invoke('ai:hasKey'),
  getKeyMasked: () => ipcRenderer.invoke('ai:getKeyMasked'),
  testApiKey: (key) => ipcRenderer.invoke('ai:testKey', key),
  removeApiKey: () => ipcRenderer.invoke('ai:removeKey'),
  listModels: () => ipcRenderer.invoke('ai:listModels'),
  getGovernorStatus: () => ipcRenderer.invoke('ai:getGovernorStatus'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  setAlwaysOnTop: (pinned) => ipcRenderer.invoke('window:setAlwaysOnTop', pinned),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),
  toggleFloatingBuddy: (show) => ipcRenderer.invoke('window:toggleFloatingBuddy', show),
  isFloatingBuddyVisible: () => ipcRenderer.invoke('window:isFloatingBuddyVisible'),
  queryResearch: (question) => ipcRenderer.invoke('research:query', question),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
}

contextBridge.exposeInMainWorld('dashboardAPI', dashboardAPI)
