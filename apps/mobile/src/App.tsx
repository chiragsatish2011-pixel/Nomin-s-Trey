/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Root Mobile Application for Trey (Companion & Standalone Multi-Mode).
 */

import React, { useState, useEffect } from 'react'
import {
  TreyMood,
  FocusSessionState,
  PairingRecord
} from '@nomin/protocol'
import { TreyCharacter } from './components/TreyCharacter'
import { StopButton } from './components/StopButton'
import { Timeline } from './components/Timeline'
import { ScannerModal } from './components/ScannerModal'
import { SettingsModal } from './components/SettingsModal'
import {
  StorageService,
  AppMode,
  AppTheme
} from './services/StorageService'
import { companionConnection, ConnectionState } from './services/CompanionConnection'
import { voiceService } from './services/VoiceService'
import { nimDirectService } from './services/NimDirectService'
import { Mic, Send, Sliders, QrCode } from 'lucide-react'

export const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>(StorageService.getActiveMode())
  const [appTheme, setAppTheme] = useState<AppTheme>(StorageService.getTheme())
  const [pairingRecord, setPairingRecord] = useState<PairingRecord | null>(
    StorageService.getPairingRecord()
  )

  // Connection & Freshness
  const [connState, setConnState] = useState<ConnectionState>('disconnected')
  const [isFresh, setIsFresh] = useState(false)

  // Character & State
  const [characterMood, setCharacterMood] = useState<TreyMood>('listening')
  const [talkLevel, setTalkLevel] = useState(0)
  const [currentSession, setCurrentSession] = useState<FocusSessionState | undefined>(undefined)
  const [takeoverActive, setTakeoverActive] = useState(false)
  const [activeStep, setActiveStep] = useState<
    { stepNumber: number; thought: string; actionDescription: string } | undefined
  >(undefined)

  // Standalone local focus state
  const [standaloneSeconds, setStandaloneSeconds] = useState(1500)
  const [standaloneRunning, setStandaloneRunning] = useState(false)

  // Modals & Inputs
  const [scannerOpen, setScannerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [taskInput, setTaskInput] = useState('')
  const [isListeningVoice, setIsListeningVoice] = useState(false)

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
            setTakeoverActive(packet.takeoverActive)
            setActiveStep(packet.takeoverStep)
            break
          case 'face':
            setCharacterMood(packet.mood)
            setTalkLevel(packet.talk)
            break
          case 'task_step':
            setActiveStep({
              stepNumber: packet.step,
              thought: packet.thought,
              actionDescription: packet.actionDescription
            })
            setCharacterMood('pointing')
            break
          case 'task_result':
            setActiveStep(undefined)
            setCharacterMood(packet.success ? 'happy' : 'resting')
            voiceService.playChirp(3, packet.success ? 'happy' : 'alert')
            break
          case 'nudge':
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

  // 2. Standalone Monotonic Timer (Single source of truth)
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
        voiceService.playChirp(4, 'happy')
        voiceService.speak('Focus session complete! Great work.')
        clearInterval(timer)
      }
    }, 250)

    return () => clearInterval(timer)
  }, [appMode, standaloneRunning])

  // Handlers
  const handleStop = async () => {
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
  }

  const handleStartTask = async (task: string, mode: 'focus' | 'takeover' = 'focus') => {
    if (!task.trim()) return
    setTaskInput('')

    if (appMode === 'companion') {
      try {
        await companionConnection.sendTaskStart(task.trim(), 30, mode)
        voiceService.playChirp(2, 'happy')
      } catch (err) {
        console.error('Task start error:', err)
      }
    } else {
      // Standalone mode: trigger direct NIM query or start focus timer
      setStandaloneSeconds(1800)
      setStandaloneRunning(true)
      setCharacterMood('thinking')

      const nimKey = StorageService.getNimApiKey()
      if (nimKey) {
        try {
          const reply = await nimDirectService.completeChat(nimKey, [{ role: 'user', content: task }])
          setCharacterMood('talking')
          voiceService.speak(reply, () => setCharacterMood('listening'))
        } catch {
          setCharacterMood('listening')
        }
      } else {
        setCharacterMood('listening')
      }
    }
  }

  const handleVoiceToggle = () => {
    if (isListeningVoice) {
      setIsListeningVoice(false)
      setCharacterMood('listening')
      return
    }

    setIsListeningVoice(true)
    setCharacterMood('listening')
    voiceService.startSpeechRecognition(
      (transcript) => {
        setIsListeningVoice(false)
        handleStartTask(transcript)
      },
      (err) => {
        console.warn('Voice recognition error:', err)
        setIsListeningVoice(false)
      }
    )
  }

  const isDark = appTheme === 'dark'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#0A0D14' : '#F1F5F9',
        color: isDark ? '#F8FAFC' : '#0F172A',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 1. Header Bar */}
      <header
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 99,
              background: appMode === 'companion' ? 'rgba(108, 134, 245, 0.18)' : 'rgba(16, 185, 129, 0.18)',
              color: appMode === 'companion' ? '#A9BCFF' : '#6EE7B7',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {appMode === 'companion' ? 'Companion' : 'Standalone'}
          </div>

          {appMode === 'companion' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color:
                  connState === 'connected' && isFresh
                    ? '#10B981'
                    : connState === 'connected' && !isFresh
                      ? '#F59E0B'
                      : '#EF4444'
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'currentColor',
                  boxShadow: '0 0 8px currentColor'
                }}
              />
              <span style={{ fontWeight: 600 }}>
                {connState === 'connected' && isFresh
                  ? 'Connected'
                  : connState === 'connected' && !isFresh
                    ? 'Stale (>5s)'
                    : connState === 'reconnecting'
                      ? 'Reconnecting'
                      : 'Disconnected'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {appMode === 'companion' && !pairingRecord && (
            <button
              onClick={() => setScannerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                background: '#6C86F5',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <QrCode size={14} />
              <span>Pair PC</span>
            </button>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              border: 'none',
              color: isDark ? '#F8FAFC' : '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      {/* 2. Character Arena */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '12px 16px 20px',
          gap: 16,
          overflowY: 'auto'
        }}
      >
        <div style={{ height: 260, width: '100%', position: 'relative' }}>
          <TreyCharacter
            mood={characterMood}
            mode="rising-sun"
            talkLevel={talkLevel}
            interactive={true}
          />
        </div>

        {/* 3. Task & Step Timeline */}
        <Timeline
          session={
            appMode === 'companion'
              ? currentSession
              : standaloneRunning
                ? {
                    id: 'standalone-focus',
                    task: 'Focus Session',
                    duration: 1800,
                    elapsed: 1800 - standaloneSeconds,
                    status: 'running',
                    detail: 'Trey is watching your focus.',
                    checks: []
                  }
                : undefined
          }
          isFresh={appMode === 'companion' ? isFresh : true}
          takeoverActive={takeoverActive}
          activeStep={activeStep}
        />

        {/* 4. Voice & Text Task Dispatch Bar */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: isDark ? '#121826' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: 14,
              padding: '0 12px'
            }}
          >
            <input
              type="text"
              placeholder={appMode === 'companion' ? 'Tell Trey what to do...' : 'Ask Trey anything...'}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartTask(taskInput)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: isDark ? '#F8FAFC' : '#0F172A',
                fontSize: 14,
                padding: '12px 0',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleStartTask(taskInput)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6C86F5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4
              }}
            >
              <Send size={18} />
            </button>
          </div>

          <button
            onClick={handleVoiceToggle}
            aria-label="Voice input"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: isListeningVoice ? '#EF4444' : '#6C86F5',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Mic size={20} />
          </button>
        </div>

        {/* 5. Big Red STOP Button (Always visible) */}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <StopButton onStop={handleStop} />
        </div>
      </main>

      {/* Modals */}
      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onPaired={(rec) => {
            setPairingRecord(rec)
            companionConnection.connect(rec)
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onModeChanged={(m) => {
            setAppMode(m)
            StorageService.setActiveMode(m)
          }}
          onThemeChanged={(t) => {
            setAppTheme(t)
            StorageService.setTheme(t)
          }}
          onDisconnectDesktop={() => {
            StorageService.setPairingRecord(null)
            setPairingRecord(null)
            companionConnection.disconnect()
            setSettingsOpen(false)
          }}
          currentMode={appMode}
          currentTheme={appTheme}
          pairedHostname={pairingRecord?.service}
        />
      )}
    </div>
  )
}
