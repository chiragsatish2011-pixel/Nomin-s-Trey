/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Full-Screen Trey Mobile App (Companion & Standalone Multi-Mode).
 * Recreates the complete full-screen experience from Riley Brown's Bluey video:
 * - Full-screen responsive canvas face on pure OLED black
 * - Touch-and-hold anywhere on the screen with radiant atmospheric glow effect
 * - Real-time audio waveform volume reactivity while speaking
 * - Direct finger gaze tracking across the entire display
 * - Apple-style minimalist floating HUD with large rounded countdown clock
 * - Instant emergency STOP button
 * - QR camera scanner with hardware BarcodeDetector + jsQR fallback
 * - Slide-up Focus Dashboard & Settings drawer
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  TreyMood,
  FocusSessionState,
  PairingRecord
} from '@nomin/protocol'
import { TreyCharacter } from './components/TreyCharacter'
import { GlowEffect } from './components/GlowEffect'
import { FaceHUD } from './components/FaceHUD'
import { ScannerModal } from './components/ScannerModal'
import { DashboardDrawer } from './components/DashboardDrawer'
import { StorageService, AppMode } from './services/StorageService'
import { companionConnection, ConnectionState } from './services/CompanionConnection'
import { voiceService } from './services/VoiceService'
import { audioRecordingService } from './services/AudioRecordingService'
import { nimDirectService } from './services/NimDirectService'

export const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(StorageService.getActiveMode())
  const [pairingRecord, setPairingRecord] = useState<PairingRecord | null>(
    StorageService.getPairingRecord()
  )

  // Connection & Freshness
  const [connState, setConnState] = useState<ConnectionState>('disconnected')
  const [isFresh, setIsFresh] = useState(false)

  // Character Face State
  const [characterMood, setCharacterMood] = useState<TreyMood>('listening')
  const [talkLevel, setTalkLevel] = useState(0)
  const [desktopGaze, setDesktopGaze] = useState<{ x: number; y: number } | undefined>(undefined)
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number } | null>(null)

  // Focus Sessions & Tasks
  const [currentSession, setCurrentSession] = useState<FocusSessionState | undefined>(undefined)
  const [standaloneSeconds, setStandaloneSeconds] = useState(1500)
  const [standaloneRunning, setStandaloneRunning] = useState(false)

  // Modals & Drawers
  const [scannerOpen, setScannerOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  // Touch and Hold Interaction State
  const [isHolding, setIsHolding] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null)
  const [volume, setVolume] = useState(voiceService.getVolume())

  // Internal Gesture Tracking
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoldingRef = useRef(false)
  const lastTapTimeRef = useRef(0)

  // 1. Companion Connection Wire Listener
  useEffect(() => {
    if (appMode !== 'companion') return

    const unsub = companionConnection.addListener({
      onStateChange: (st) => setConnState(st),
      onFreshnessChange: (fresh) => setIsFresh(fresh),
      onPacket: (packet) => {
        switch (packet.type) {
          case 'state':
            setCurrentSession(packet.current)
            break
          case 'face':
            setCharacterMood(packet.mood)
            setTalkLevel(packet.talk)
            setDesktopGaze({ x: packet.gazeX, y: packet.gazeY })
            break
          case 'task_result':
            setCharacterMood(packet.success ? 'happy' : 'resting')
            voiceService.playChirp(3, packet.success ? 'happy' : 'alert')
            break
          case 'nudge':
            voiceService.triggerHaptic('alert')
            voiceService.playChirp(2, 'alert')
            break
          default:
            break
        }
      },
      onError: (err) => console.warn('[App] Connection warning:', err)
    })

    if (pairingRecord) {
      companionConnection.connect(pairingRecord)
    }

    return () => {
      unsub()
      companionConnection.disconnect()
    }
  }, [appMode, pairingRecord])

  // 2. Audio Level Stream Listener for Glow Reactivity
  useEffect(() => {
    const unsub = audioRecordingService.addLevelListener((lvl) => {
      setAudioLevel(lvl)
      if (isHoldingRef.current) {
        setTalkLevel(lvl)
      }
    })
    return unsub
  }, [])

  // 3. Standalone Monotonic Timer (Single source of truth)
  useEffect(() => {
    if (appMode !== 'standalone' || !standaloneRunning) return

    const startTimestamp = Date.now()
    const initialSeconds = standaloneSeconds

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000)
      const left = Math.max(0, initialSeconds - elapsed)
      setStandaloneSeconds(left)

      if (left === 0) {
        setStandaloneRunning(false)
        setCharacterMood('happy')
        voiceService.triggerHaptic('alert')
        voiceService.playChirp(4, 'happy')
        voiceService.speak('Focus session complete! Great work.')
        clearInterval(timer)
      }
    }, 250)

    return () => clearInterval(timer)
  }, [appMode, standaloneRunning, standaloneSeconds])

  // Handlers
  const handleStop = useCallback(async () => {
    voiceService.triggerHaptic('alert')
    voiceService.playChirp(2, 'alert')
    if (appMode === 'companion') {
      try {
        await companionConnection.sendStop('Emergency STOP commanded from phone')
      } catch (err) {
        console.error('Stop command failed:', err)
      }
    } else {
      setStandaloneRunning(false)
      setCharacterMood('resting')
    }
  }, [appMode])

  const handleStartTask = useCallback(async (task: string, durationMinutes = 30) => {
    if (!task.trim()) return

    if (appMode === 'companion') {
      try {
        await companionConnection.sendTaskStart(task.trim(), durationMinutes, 'focus')
        voiceService.playChirp(2, 'happy')
      } catch (err) {
        console.error('Task start error:', err)
      }
    } else {
      setStandaloneSeconds(durationMinutes * 60)
      setStandaloneRunning(true)
      setCharacterMood('thinking')
      setIsThinking(true)

      const nimKey = StorageService.getNimApiKey()
      if (nimKey) {
        try {
          const reply = await nimDirectService.completeChat(nimKey, [
            {
              role: 'system',
              content: 'You are Trey, an encouraging, friendly focus buddy. Keep answers to 1-2 concise, cheerful sentences.'
            },
            { role: 'user', content: task }
          ])
          setIsThinking(false)
          setCharacterMood('talking')
          voiceService.playChirp(3, 'happy')
          voiceService.speak(reply, () => setCharacterMood('listening'))
        } catch {
          setIsThinking(false)
          setCharacterMood('listening')
        }
      } else {
        setIsThinking(false)
        voiceService.playChirp(3, 'happy')
        setCharacterMood('listening')
      }
    }
  }, [appMode])

  // Process Completed Touch-and-Hold Voice Turn
  const handleProcessVoiceTurn = useCallback(async () => {
    setIsThinking(true)
    setCharacterMood('thinking')
    voiceService.playChirp(2, 'curious')

    if (appMode === 'companion') {
      // In Companion mode, trigger focus task on desktop
      handleStartTask('Voice Focus Task', 25)
      setTimeout(() => {
        setIsThinking(false)
        setCharacterMood('listening')
      }, 1200)
    } else {
      // Standalone mode: AI chat response
      const nimKey = StorageService.getNimApiKey()
      if (nimKey) {
        try {
          const reply = await nimDirectService.completeChat(nimKey, [
            {
              role: 'system',
              content: 'You are Trey, a friendly focus buddy. Greet your user and encourage their current work in 1 brief cheerful sentence.'
            },
            { role: 'user', content: 'Hey Trey, I just checked in with you.' }
          ])
          setIsThinking(false)
          setCharacterMood('talking')
          voiceService.playChirp(3, 'happy')
          voiceService.speak(reply, () => setCharacterMood('listening'))
        } catch {
          setIsThinking(false)
          setCharacterMood('listening')
        }
      } else {
        setTimeout(() => {
          setIsThinking(false)
          setCharacterMood('happy')
          voiceService.playChirp(3, 'happy')
          voiceService.speak('I am listening! Add your NVIDIA NIM key in settings for direct AI replies.')
        }, 800)
      }
    }
  }, [appMode, handleStartTask])

  // Gesture: Pointer Events for Touch and Hold
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setTouchPoint({ x: normX, y: normY })
    setTouchPos({ x: e.clientX, y: e.clientY })

    // Double-tap check (< 300ms)
    const now = performance.now()
    if (now - lastTapTimeRef.current < 300) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
      voiceService.triggerHaptic('tap')
      // Toggle wake / sleep or pause
      if (standaloneRunning) {
        handleStop()
      } else {
        voiceService.playChirp(3, 'happy')
        setCharacterMood((m) => (m === 'sleepy' ? 'happy' : 'sleepy'))
      }
      lastTapTimeRef.current = 0
      return
    }
    lastTapTimeRef.current = now

    // Touch-and-hold trigger threshold: 220ms
    holdTimerRef.current = setTimeout(async () => {
      isHoldingRef.current = true
      setIsHolding(true)
      setCharacterMood('listening')
      voiceService.triggerHaptic('hold')
      voiceService.playChirp(1, 'curious')
      await audioRecordingService.startListening()
    }, 220)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setTouchPoint({ x: normX, y: normY })
    setTouchPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = async () => {
    setTouchPoint(null)
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (isHoldingRef.current) {
      isHoldingRef.current = false
      setIsHolding(false)
      voiceService.triggerHaptic('release')
      await audioRecordingService.stopListening()
      handleProcessVoiceTurn()
    }
  }

  const handleToggleSound = () => {
    const newVol = volume > 0 ? 0 : 1
    setVolume(newVol)
    voiceService.setVolume(newVol)
    if (newVol > 0) {
      voiceService.playChirp(2, 'happy')
    }
  }

  // Calculate remaining countdown seconds
  const remainingSeconds =
    appMode === 'companion'
      ? currentSession
        ? Math.max(0, currentSession.duration - currentSession.elapsed)
        : 1800
      : standaloneSeconds

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Layer 1: Ethereal Touch-and-Hold Luminous Aura Glow */}
      <GlowEffect
        isHolding={isHolding}
        isThinking={isThinking}
        audioLevel={audioLevel}
        touchPos={touchPos}
      />

      {/* Layer 2: Full-Screen Canvas Character */}
      <TreyCharacter
        mood={characterMood}
        talkLevel={talkLevel}
        gazePoint={desktopGaze}
        touchPoint={touchPoint}
        interactive={true}
      />

      {/* Layer 3: Floating Apple-Style Glass HUD */}
      <FaceHUD
        appMode={appMode}
        connState={connState}
        isFresh={isFresh}
        currentSession={currentSession}
        standaloneRunning={standaloneRunning}
        remainingSeconds={remainingSeconds}
        isAsking={isHolding}
        isThinking={isThinking}
        audioLevel={audioLevel}
        volume={volume}
        onToggleSound={handleToggleSound}
        onOpenScanner={() => setScannerOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
        onStop={handleStop}
      />

      {/* Layer 4: QR Scanner Modal */}
      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onPaired={(rec) => {
            setPairingRecord(rec)
            companionConnection.connect(rec)
          }}
        />
      )}

      {/* Layer 5: Focus Dashboard & Settings Drawer */}
      {dashboardOpen && (
        <DashboardDrawer
          onClose={() => setDashboardOpen(false)}
          currentMode={appMode}
          onModeChanged={(m) => {
            setAppMode(m)
            StorageService.setActiveMode(m)
          }}
          onStartTask={(t, mins) => handleStartTask(t, mins)}
          onStopTask={handleStop}
          currentSession={currentSession}
          isPaired={!!pairingRecord}
          pairedHostname={pairingRecord?.service}
          onDisconnectDesktop={() => {
            StorageService.setPairingRecord(null)
            setPairingRecord(null)
            companionConnection.disconnect()
          }}
          onOpenScanner={() => {
            setDashboardOpen(false)
            setScannerOpen(true)
          }}
        />
      )}
    </div>
  )
}
