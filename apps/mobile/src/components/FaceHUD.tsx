/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Minimalist Floating Glass HUD for Full-Screen Trey.
 * Direct translation of Bluey's FocusFaceHUD:
 * - Top-left: Mission task title, status line, voice level capsule
 * - Top-right: Quick action pills (Pair QR, Dashboard Drawer, Sound)
 * - Bottom-right: Large monospaced Apple-style countdown clock
 * - Emergency STOP button
 */

import React from 'react'
import { FocusSessionState } from '@nomin/protocol'
import { ConnectionState } from '../services/CompanionConnection'
import { AppMode } from '../services/StorageService'
import { QrCode, Sliders, Volume2, VolumeX, AlertOctagon } from 'lucide-react'

export interface FaceHUDProps {
  appMode: AppMode
  connState: ConnectionState
  isFresh: boolean
  currentSession?: FocusSessionState
  standaloneRunning: boolean
  remainingSeconds: number
  isAsking: boolean
  isThinking: boolean
  audioLevel: number
  volume: number
  onToggleSound: () => void
  onOpenScanner: () => void
  onOpenDashboard: () => void
  onStop: () => void
}

export const FaceHUD: React.FC<FaceHUDProps> = ({
  appMode,
  connState,
  isFresh,
  currentSession,
  standaloneRunning,
  remainingSeconds,
  isAsking,
  isThinking,
  audioLevel,
  volume,
  onToggleSound,
  onOpenScanner,
  onOpenDashboard,
  onStop
}) => {
  // Format MM:SS
  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const clockText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isSessionRunning =
    (appMode === 'companion' && currentSession && currentSession.status === 'running') ||
    (appMode === 'standalone' && standaloneRunning)

  // Status text determination
  let statusText = 'Hold Trey to speak'
  if (isAsking) {
    statusText = 'Recording your request...'
  } else if (isThinking) {
    statusText = 'Thinking...'
  } else if (appMode === 'companion') {
    if (connState === 'connected' && isFresh) {
      if (currentSession && currentSession.status === 'running') {
        const lastCheck = currentSession.checks[currentSession.checks.length - 1]
        if (lastCheck) {
          statusText =
            lastCheck.activity === 'on_task'
              ? 'On task'
              : lastCheck.activity === 'off_task'
                ? `Off task · ${Math.round(lastCheck.probability * 100)}% estimate`
                : 'Focusing together'
        } else {
          statusText = 'Focusing together'
        }
      } else {
        statusText = 'Hold Trey and describe a task'
      }
    } else if (connState === 'connected' && !isFresh) {
      statusText = 'Connection stale (>5s) · retrying...'
    } else if (connState === 'reconnecting') {
      statusText = 'Reconnecting to PC...'
    } else {
      statusText = 'Tap QR to pair with PC'
    }
  } else {
    statusText = standaloneRunning ? 'Standalone focus active' : 'Hold Trey to ask anything'
  }

  const missionTitle =
    (appMode === 'companion' && currentSession?.task) ||
    (appMode === 'standalone' && standaloneRunning ? 'Focus Session' : 'What’s the mission?')

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(14px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left))',
        color: '#FFFFFF'
      }}
    >
      {/* Top Header Region */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        {/* Mission & Status Pill */}
        <div style={{ pointerEvents: 'auto', maxWidth: 360 }}>
          <div
            onClick={onOpenDashboard}
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
              cursor: 'pointer'
            }}
          >
            {missionTitle}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.75)',
              fontFamily: 'monospace'
            }}
          >
            {appMode === 'companion' && (
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background:
                    connState === 'connected' && isFresh
                      ? '#10B981'
                      : connState === 'connected' && !isFresh
                        ? '#F59E0B'
                        : '#EF4444',
                  boxShadow: '0 0 6px currentColor'
                }}
              />
            )}
            <span>{statusText}</span>
          </div>

          {/* Voice Input Level Pill (Expands with user voice) */}
          {isAsking && (
            <div
              style={{
                marginTop: 8,
                height: 4,
                width: Math.max(24, Math.min(200, 24 + audioLevel * 180)),
                background: '#FFFFFF',
                borderRadius: 99,
                boxShadow: '0 0 10px #FFFFFF',
                transition: 'width 60ms ease-out'
              }}
            />
          )}
        </div>

        {/* Top-Right Glass Buttons */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pair PC Button */}
          {appMode === 'companion' && (
            <button
              onClick={onOpenScanner}
              aria-label="Pair PC"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <QrCode size={18} />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: volume > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Dashboard / Settings Drawer */}
          <button
            onClick={onOpenDashboard}
            aria-label="Open dashboard"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Sliders size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Region */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        {/* Left: Emergency STOP Button when session is running */}
        <div style={{ pointerEvents: 'auto' }}>
          {isSessionRunning ? (
            <button
              onClick={onStop}
              aria-label="Stop Session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 99,
                background: 'rgba(239, 68, 68, 0.9)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              <AlertOctagon size={18} />
              <span>STOP</span>
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
              Hold anywhere to speak · Double tap to toggle
            </div>
          )}
        </div>

        {/* Right: Giant Monospaced Countdown Clock */}
        <div
          onClick={onOpenDashboard}
          style={{
            pointerEvents: 'auto',
            fontSize: 56,
            fontWeight: 700,
            fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 4px 24px rgba(0, 0, 0, 0.7)',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          {clockText}
        </div>
      </div>
    </div>
  )
}
