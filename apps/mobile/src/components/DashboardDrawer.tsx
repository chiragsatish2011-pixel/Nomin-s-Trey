/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Apple-Style Focus Dashboard & Settings Drawer for Trey Mobile.
 * Inspired by BlueyAppView & FocusDashboard:
 * - Fluid spring bottom sheet with gesture dismiss
 * - Mission task creator & duration stepper
 * - Mode switcher: Mode A Companion vs Mode B Standalone
 * - NVIDIA NIM API Key management & local storage
 * - Procedural cartoon chirp volume control
 * - Focus history & paired PC manager
 */

import React, { useState } from 'react'
import { FocusSessionState } from '@nomin/protocol'
import { AppMode, StorageService } from '../services/StorageService'
import { voiceService } from '../services/VoiceService'
import {
  X,
  Play,
  Square,
  Sparkles,
  Laptop
} from 'lucide-react'

interface DashboardDrawerProps {
  onClose: () => void
  currentMode: AppMode
  onModeChanged: (mode: AppMode) => void
  onStartTask: (task: string, durationMinutes: number) => void
  onStopTask: () => void
  currentSession?: FocusSessionState
  isPaired: boolean
  pairedHostname?: string
  onDisconnectDesktop: () => void
  onOpenScanner: () => void
}

export const DashboardDrawer: React.FC<DashboardDrawerProps> = ({
  onClose,
  currentMode,
  onModeChanged,
  onStartTask,
  onStopTask,
  currentSession,
  isPaired,
  pairedHostname,
  onDisconnectDesktop,
  onOpenScanner
}) => {
  const [taskText, setTaskText] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [activeTab, setActiveTab] = useState<'mission' | 'settings'>('mission')
  const [nimKey, setNimKey] = useState(StorageService.getNimApiKey() || '')
  const [keySaved, setKeySaved] = useState(false)
  const [chirpVol, setChirpVol] = useState(voiceService.getVolume())

  const handleSaveKey = () => {
    StorageService.setNimApiKey(nimKey.trim())
    setKeySaved(true)
    voiceService.triggerHaptic('tap')
    voiceService.playChirp(2, 'happy')
    setTimeout(() => setKeySaved(false), 2000)
  }

  const handleVolChange = (val: number) => {
    setChirpVol(val)
    voiceService.setVolume(val)
    voiceService.playChirp(2, 'happy')
  }

  const handleStart = () => {
    if (!taskText.trim()) return
    onStartTask(taskText.trim(), minutes)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 200ms ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '90vh',
          background: '#0B0F19',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px calc(24px + env(safe-area-inset-bottom)) 24px',
          color: '#FFFFFF',
          overflowY: 'auto',
          animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Indicator */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 99,
            background: 'rgba(255, 255, 255, 0.25)',
            alignSelf: 'center',
            marginBottom: 16
          }}
        />

        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #6C86F5, #4254D6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Trey Dashboard</div>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>
                {currentMode === 'companion' ? 'Paired with PC' : 'Standalone Focus Mode'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Mission vs Settings */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: 4,
            borderRadius: 14,
            marginBottom: 20
          }}
        >
          <button
            onClick={() => {
              setActiveTab('mission')
              voiceService.triggerHaptic('tap')
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'mission' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: activeTab === 'mission' ? '#FFFFFF' : '#94A3B8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease-out'
            }}
          >
            Focus Mission
          </button>
          <button
            onClick={() => {
              setActiveTab('settings')
              voiceService.triggerHaptic('tap')
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? '#FFFFFF' : '#94A3B8',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease-out'
            }}
          >
            Settings & AI
          </button>
        </div>

        {activeTab === 'mission' ? (
          <div>
            {/* Active Session Status */}
            {currentSession && currentSession.status !== 'ended' ? (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                  borderRadius: 20,
                  padding: 18,
                  marginBottom: 20
                }}
              >
                <div style={{ fontSize: 12, color: '#818CF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Current Active Mission
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {currentSession.task}
                </div>
                <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 16 }}>
                  Status: {currentSession.status === 'running' ? 'Focused' : 'Paused'}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={onStopTask}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: '#EF4444',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={16} fill="currentColor" />
                    <span>End Focus Session</span>
                  </button>
                </div>
              </div>
            ) : (
              /* New Mission Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    What are we focusing on?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Write project report, code API..."
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      color: '#FFFFFF',
                      fontSize: 15,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    Duration: {minutes} minutes
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[15, 25, 45, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMinutes(m)
                          voiceService.triggerHaptic('tap')
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 12,
                          background: minutes === m ? '#6366F1' : 'rgba(255, 255, 255, 0.06)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!taskText.trim()}
                  style={{
                    marginTop: 8,
                    padding: '15px 20px',
                    borderRadius: 16,
                    background: taskText.trim() ? '#6366F1' : 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: taskText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 150ms ease-out'
                  }}
                >
                  <Play size={18} fill="currentColor" />
                  <span>Start Focus Mission</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Settings Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* 1. Mode Switcher */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                Operation Mode
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    onModeChanged('companion')
                    voiceService.triggerHaptic('tap')
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 12px',
                    borderRadius: 14,
                    background: currentMode === 'companion' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: currentMode === 'companion' ? '1.5px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>🤝 Companion</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Mirrors PC desktop</div>
                </button>

                <button
                  onClick={() => {
                    onModeChanged('standalone')
                    voiceService.triggerHaptic('tap')
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 12px',
                    borderRadius: 14,
                    background: currentMode === 'standalone' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: currentMode === 'standalone' ? '1.5px solid #34D399' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>⚡ Standalone</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>No PC required</div>
                </button>
              </div>
            </div>

            {/* 2. Pairing & Desktop Connection */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                Desktop Connection
              </div>
              {isPaired ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Laptop size={20} color="#818CF8" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{pairedHostname || 'Desktop Trey'}</div>
                      <div style={{ fontSize: 11, color: '#34D399' }}>Pairing Active</div>
                    </div>
                  </div>
                  <button
                    onClick={onDisconnectDesktop}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: '#F87171',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Unpair
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose()
                    onOpenScanner()
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 14,
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(129, 140, 248, 0.4)',
                    color: '#818CF8',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <Laptop size={18} />
                  <span>Pair with PC (Scan QR)</span>
                </button>
              )}
            </div>

            {/* 3. Cartoon Chirp Volume */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1' }}>Chirp Sound Volume</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{Math.round(chirpVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chirpVol}
                onChange={(e) => handleVolChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#6366F1' }}
              />
            </div>

            {/* 4. NVIDIA NIM API Key */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>
                NVIDIA NIM API Key (Standalone Mode)
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
                Stored strictly on your device. Used for standalone AI voice & text assistance.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  placeholder="nvapi-..."
                  value={nimKey}
                  onChange={(e) => setNimKey(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSaveKey}
                  style={{
                    padding: '0 16px',
                    borderRadius: 12,
                    background: '#6366F1',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {keySaved ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
