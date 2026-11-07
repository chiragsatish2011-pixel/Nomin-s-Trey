/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Typed Preload IPC Bridge for the Transparent Overlay Window.
 */

import { contextBridge, ipcRenderer } from 'electron'

export interface ResearchReportPayload {
  question: string
  title: string
  paragraphs: string[]
  sources: Array<{ title: string; url: string }>
  takeaway: string
}

export interface TakeoverStatusPayload {
  active: boolean
  task?: string
  step?: number
  maxSteps?: number
  thought?: string
  status?: 'thinking' | 'pointing' | 'acting' | 'done' | 'stopped'
}

export interface AnimateCursorPayload {
  x: number
  y: number
  actionType: string
  durationMs?: number
}

export interface TriggerRipplePayload {
  x: number
  y: number
  button?: 'left' | 'right' | 'middle'
}

export interface OverlayAPI {
  onNudge: (callback: (nudge: { message: string; target?: { x: number; y: number; text: string } }) => void) => () => void
  onReport: (callback: (report: ResearchReportPayload) => void) => () => void
  onTakeoverStatus: (callback: (status: TakeoverStatusPayload) => void) => () => void
  onAnimateCursor: (callback: (data: AnimateCursorPayload) => void) => () => void
  onTriggerRipple: (callback: (data: TriggerRipplePayload) => void) => () => void
  hideNudge: () => void
  setIgnoreMouseEvents: (ignore: boolean) => void
  openExternal: (url: string) => Promise<void>
  stopTakeover: () => Promise<void>
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
  onTakeoverStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: TakeoverStatusPayload) => callback(status)
    ipcRenderer.on('overlay:takeoverStatus', handler)
    return () => {
      ipcRenderer.removeListener('overlay:takeoverStatus', handler)
    }
  },
  onAnimateCursor: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AnimateCursorPayload) => callback(data)
    ipcRenderer.on('overlay:animateCursor', handler)
    return () => {
      ipcRenderer.removeListener('overlay:animateCursor', handler)
    }
  },
  onTriggerRipple: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: TriggerRipplePayload) => callback(data)
    ipcRenderer.on('overlay:triggerRipple', handler)
    return () => {
      ipcRenderer.removeListener('overlay:triggerRipple', handler)
    }
  },
  hideNudge: () => {
    ipcRenderer.send('overlay:hide')
  },
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('overlay:setIgnoreMouseEvents', { ignore })
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  stopTakeover: () => ipcRenderer.invoke('agent:stopTakeover')
}

contextBridge.exposeInMainWorld('overlayAPI', overlayAPI)
