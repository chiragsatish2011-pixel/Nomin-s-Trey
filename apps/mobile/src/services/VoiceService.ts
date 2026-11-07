/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Procedural Audio Synthesizer, Haptic Feedback & Speech Service for Trey Mobile.
 * Implements Bluey-inspired pentatonic cartoon chirps and tactile vibrations.
 */

// Pentatonic scale: C5 to E6
const CHIRP_SCALE = [523.25, 587.35, 659.25, 784.0, 880.0, 1046.5, 1174.65, 1318.5]

interface SpeechRecognitionResultItem {
  transcript: string
}
interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem
  }
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent {
  error: string
}
interface ISpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

export class VoiceService {
  private audioCtx: AudioContext | null = null
  private recognition: ISpeechRecognition | null = null
  private isListening = false
  private volume = 1.0

  constructor() {
    try {
      const savedVol = localStorage.getItem('trey_chirp_volume')
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 1.0
      }
    } catch {
      this.volume = 1.0
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol))
    try {
      localStorage.setItem('trey_chirp_volume', String(this.volume))
    } catch {
      // ignore localStorage errors in sandboxed webviews
    }
  }

  getVolume(): number {
    return this.volume
  }

  /**
   * Tactile Haptic Vibration Feedback for physical touch responses
   */
  triggerHaptic(type: 'hold' | 'release' | 'tap' | 'alert' = 'tap'): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'hold':
            navigator.vibrate([35])
            break
          case 'release':
            navigator.vibrate([20])
            break
          case 'tap':
            navigator.vibrate([15])
            break
          case 'alert':
            navigator.vibrate([40, 60, 40])
            break
        }
      } catch {
        // ignore vibration unsupported errors
      }
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      if (typeof window === 'undefined') {
        throw new Error('Web Audio API not supported in non-browser environment')
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported')
      }
      this.audioCtx = new AudioContextClass()
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * Procedural cartoon chirp generator using pentatonic scale sine oscillators with 12% 2nd harmonic.
   * Zero disk files required; runs 100% offline.
   */
  playChirp(notesCount = 3, mood: 'happy' | 'alert' | 'curious' = 'happy'): void {
    if (this.volume <= 0.01) return
    try {
      const ctx = this.getAudioContext()
      const now = ctx.currentTime

      const baseNotes =
        mood === 'happy'
          ? [CHIRP_SCALE[2], CHIRP_SCALE[4], CHIRP_SCALE[7]]
          : mood === 'alert'
            ? [CHIRP_SCALE[6], CHIRP_SCALE[3], CHIRP_SCALE[1]]
            : [CHIRP_SCALE[0], CHIRP_SCALE[2], CHIRP_SCALE[5]]

      const notes = baseNotes.slice(0, notesCount)

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.085
        const duration = 0.08

        // Fundamental oscillator
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        // Cartoon pitch scoop (first 20ms)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, startTime + 0.02)

        // 2nd harmonic overtone for cartoon warmth
        const osc2 = ctx.createOscillator()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(freq * 2, startTime)

        const gainNode = ctx.createGain()
        gainNode.gain.setValueAtTime(0.001, startTime)
        // Fast attack scaled by volume
        gainNode.gain.linearRampToValueAtTime(0.2 * this.volume, startTime + 0.008)
        // Exponential decay
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        const gainNode2 = ctx.createGain()
        gainNode2.gain.setValueAtTime(0.02 * this.volume, startTime)
        gainNode2.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        osc.connect(gainNode)
        osc2.connect(gainNode2)
        gainNode.connect(ctx.destination)
        gainNode2.connect(ctx.destination)

        osc.start(startTime)
        osc2.start(startTime)
        osc.stop(startTime + duration)
        osc2.stop(startTime + duration)
      })
    } catch (err) {
      console.warn('[VoiceService] Procedural audio error:', err)
    }
  }

  startSpeechRecognition(
    onResult: (transcript: string) => void,
    onError: (err: string) => void
  ): () => void {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      onError('Speech recognition not available on this device.')
      return () => {}
    }

    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = false
      this.recognition.lang = 'en-US'

      this.recognition.onstart = () => {
        this.isListening = true
        this.playChirp(2, 'curious')
      }

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        if (transcript.trim()) {
          this.playChirp(3, 'happy')
          onResult(transcript.trim())
        }
      }

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false
        onError(event.error || 'Speech recognition failed.')
      }

      this.recognition.onend = () => {
        this.isListening = false
      }

      this.recognition.start()

      return () => {
        if (this.recognition && this.isListening) {
          try {
            this.recognition.stop()
          } catch {
            // ignore cleanup errors
          }
        }
        this.isListening = false
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unknown recognition error')
      return () => {}
    }
  }

  speak(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.15
    utterance.volume = this.volume

    utterance.onend = () => {
      if (onEnd) onEnd()
    }
    utterance.onerror = () => {
      if (onEnd) onEnd()
    }

    window.speechSynthesis.speak(utterance)
  }
}

export const voiceService = new VoiceService()
