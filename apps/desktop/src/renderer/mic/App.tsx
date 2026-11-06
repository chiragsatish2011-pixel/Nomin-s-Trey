import React, { useEffect, useRef } from 'react'

interface SpeechRecognitionResultItem {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface ISpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition

interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export default function App(): React.JSX.Element {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptRef = useRef<string>('')

  useEffect(() => {
    const api = (window as unknown as {
      micAPI?: {
        onStartRecording: (cb: () => void) => () => void
        onStopRecording: (cb: () => void) => () => void
        sendTranscription: (result: { text: string; error?: string }) => void
        sendAudioBuffer: (payload: { buffer: ArrayBuffer; mimeType: string; webText?: string }) => void
      }
    }).micAPI

    if (!api) return

    // Set up SpeechRecognition if available in Chromium
    const win = window as unknown as WindowWithSpeechRecognition
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let full = ''
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript + ' '
          }
          transcriptRef.current = full.trim()
        }

        recognitionRef.current = recognition
      } catch (err) {
        console.warn('SpeechRecognition init error:', err)
      }
    }

    const unsubStart = api.onStartRecording(async () => {
      audioChunksRef.current = []
      transcriptRef.current = ''

      // Start speech recognition if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          // Handled
        }
      }

      // Record in memory with MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        const recorder = new MediaRecorder(stream, { mimeType })

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data)
          }
        }

        recorder.start(100)
        mediaRecorderRef.current = recorder
      } catch (err) {
        console.warn('Mic access error:', err)
      }
    })

    const unsubStop = api.onStopRecording(async () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Handled
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }

      setTimeout(async () => {
        const webText = transcriptRef.current.trim()

        if (audioChunksRef.current.length > 0) {
          const mimeType = audioChunksRef.current[0].type || 'audio/webm'
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const buffer = await blob.arrayBuffer()
          api.sendAudioBuffer({ buffer, mimeType, webText })
        } else {
          api.sendTranscription({ text: webText })
        }

        audioChunksRef.current = []
        transcriptRef.current = ''
      }, 350)
    })

    return () => {
      unsubStart()
      unsubStop()
    }
  }, [])

  return <div style={{ display: 'none' }}>Trey Hidden Microphone Window</div>
}
