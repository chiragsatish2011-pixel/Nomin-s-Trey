import { contextBridge, ipcRenderer } from 'electron'

export interface ResearchReportPayload {
  question: string
  title: string
  paragraphs: string[]
  sources: Array<{ title: string; url: string }>
  takeaway: string
}

export interface OverlayAPI {
  onNudge: (callback: (nudge: { message: string; target?: { x: number; y: number; text: string } }) => void) => () => void
  onReport: (callback: (report: ResearchReportPayload) => void) => () => void
  hideNudge: () => void
  setIgnoreMouseEvents: (ignore: boolean) => void
  openExternal: (url: string) => Promise<void>
}

const overlayAPI: OverlayAPI = {
  onNudge: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, nudge: { message: string; target?: { x: number; y: number; text: string } }) =>
      callback(nudge)
    ipcRenderer.on('overlay:nudge', handler)
    return () => {
      ipcRenderer.removeListener('overlay:nudge', handler)
    }
  },
  onReport: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, report: ResearchReportPayload) => callback(report)
    ipcRenderer.on('overlay:report', handler)
    return () => {
      ipcRenderer.removeListener('overlay:report', handler)
    }
  },
  hideNudge: () => {
    ipcRenderer.send('overlay:hide')
  },
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('overlay:setIgnoreMouseEvents', { ignore })
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('overlayAPI', overlayAPI)
