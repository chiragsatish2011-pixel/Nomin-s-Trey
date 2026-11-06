import { contextBridge, ipcRenderer } from 'electron'

export interface CursorPayload {
  x: number
  y: number
  faceX: number
  faceY: number
  width: number
  height: number
}

export interface FocusSyncPayload {
  current?: {
    task: string
    duration: number
    elapsed: number
    status: string
    detail: string
  }
  developerMode: boolean
  formattedTime: string
}

export interface FaceAPI {
  onCursorMoved: (callback: (payload: CursorPayload) => void) => () => void
  onExpressionChanged: (callback: (expression: string) => void) => () => void
  onSessionSync: (callback: (sync: FocusSyncPayload) => void) => () => void
  moveWindow: (dx: number, dy: number) => Promise<void>
  resizeWindow: (deltaFactor: number) => Promise<{ width: number; height: number }>
  resetSize: () => Promise<void>
}

const faceAPI: FaceAPI = {
  onCursorMoved: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: CursorPayload) => callback(payload)
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
  onSessionSync: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sync: FocusSyncPayload) => callback(sync)
    ipcRenderer.on('focus:sync', handler)
    return () => {
      ipcRenderer.removeListener('focus:sync', handler)
    }
  },
  moveWindow: (dx, dy) => ipcRenderer.invoke('face:moveBy', { dx, dy }),
  resizeWindow: (deltaFactor) => ipcRenderer.invoke('face:resize', { deltaFactor }),
  resetSize: () => ipcRenderer.invoke('face:resetSize')
}

contextBridge.exposeInMainWorld('faceAPI', faceAPI)
