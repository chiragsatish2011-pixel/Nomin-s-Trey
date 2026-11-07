/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Real-time Audio Analyzer & Recording Service for Trey Mobile.
 * Uses Web Audio API AnalyserNode for zero-latency voice level metering (glow effect),
 * MediaRecorder for audio capture, and Web Speech API / NIM Whisper for transcription.
 */

export interface AudioLevelListener {
  (level: number): void
}

export class AudioRecordingService {
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private micStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private animFrameId: number | null = null
  private levelListeners: Set<AudioLevelListener> = new Set()
  private isRecording = false

  addLevelListener(listener: AudioLevelListener): () => void {
    this.levelListeners.add(listener)
    return () => this.levelListeners.delete(listener)
  }

  private notifyLevel(level: number): void {
    for (const l of this.levelListeners) {
      l(level)
    }
  }

  async startListening(): Promise<boolean> {
    if (this.isRecording) return true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      this.micStream = stream

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume()
        }

        const source = this.audioCtx.createMediaStreamSource(stream)
        this.analyser = this.audioCtx.createAnalyser()
        this.analyser.fftSize = 256
        this.analyser.smoothingTimeConstant = 0.5
        source.connect(this.analyser)

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

        const meterLoop = () => {
          if (!this.analyser || !this.isRecording) return
          this.analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          // Normalize to 0..1 with slight non-linear boost for speech responsiveness
          const normalized = Math.min(1.0, Math.pow(avg / 128, 1.2))
          this.notifyLevel(normalized)
          this.animFrameId = requestAnimationFrame(meterLoop)
        }

        this.isRecording = true
        meterLoop()
      } else {
        this.isRecording = true
      }

      // Start MediaRecorder if supported
      if (typeof MediaRecorder !== 'undefined') {
        try {
          this.recordedChunks = []
          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : ''
          this.mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream)

          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data)
            }
          }
          this.mediaRecorder.start(100)
        } catch {
          // MediaRecorder optional
        }
      }

      return true
    } catch (err) {
      console.warn('[AudioRecordingService] Mic stream access error:', err)
      this.stopListening()
      return false
    }
  }

  stopListening(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.isRecording = false
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId)
        this.animFrameId = null
      }
      this.notifyLevel(0)

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm'
          })
          this.cleanupStreams()
          resolve(blob)
        }
        try {
          this.mediaRecorder.stop()
        } catch {
          this.cleanupStreams()
          resolve(null)
        }
      } else {
        this.cleanupStreams()
        resolve(null)
      }
    })
  }

  private cleanupStreams(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this.analyser = null
    this.mediaRecorder = null
  }
}

export const audioRecordingService = new AudioRecordingService()
