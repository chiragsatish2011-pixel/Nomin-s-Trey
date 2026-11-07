/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Procedural Audio Synthesizer & Speech Recognition Service for Trey Mobile.
 * Implements Bluey-inspired pentatonic cartoon chirps and on-device STT/TTS.
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

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
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
        const startTime = now + idx * 0.09
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
        // Fast attack
        gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.008)
        // Exponential decay
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        const gainNode2 = ctx.createGain()
        gainNode2.gain.setValueAtTime(0.02, startTime)
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
      onError('Speech recognition is not supported on this device/browser.')
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
            // ignore
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
    utterance.pitch = 1.15 // Slightly higher pitch matching character personality

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
