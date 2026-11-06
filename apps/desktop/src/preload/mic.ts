import { contextBridge, ipcRenderer } from 'electron'

export interface MicAPI {
  onStartRecording: (callback: () => void) => () => void
  onStopRecording: (callback: () => void) => () => void
  sendTranscription: (result: { text: string; error?: string }) => void
  sendAudioBuffer: (payload: { buffer: ArrayBuffer; mimeType: string; webText?: string }) => void
}

const micAPI: MicAPI = {
  onStartRecording: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('mic:start', handler)
    return () => {
      ipcRenderer.removeListener('mic:start', handler)
    }
  },
  onStopRecording: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('mic:stop', handler)
    return () => {
      ipcRenderer.removeListener('mic:stop', handler)
    }
  },
  sendTranscription: (result) => {
    ipcRenderer.send('mic:transcription', result)
  },
  sendAudioBuffer: (payload) => {
    ipcRenderer.send('mic:audio-buffer', payload)
  }
}

contextBridge.exposeInMainWorld('micAPI', micAPI)
