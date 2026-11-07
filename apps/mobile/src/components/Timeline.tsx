/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Single-Source-of-Truth Focus & Takeover Progress Timeline Component for Trey Mobile.
 */

import React from 'react'
import { FocusSessionState } from '@nomin/protocol'

interface TimelineProps {
  session?: FocusSessionState
  isFresh?: boolean
  takeoverActive?: boolean
  activeStep?: { stepNumber: number; thought: string; actionDescription: string }
  className?: string
  style?: React.CSSProperties
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const Timeline: React.FC<TimelineProps> = ({
  session,
  isFresh = true,
  takeoverActive = false,
  activeStep,
  className,
  style
}) => {
  if (!session && !takeoverActive) {
    return (
      <div
        className={className}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          padding: '24px 20px',
          textAlign: 'center',
          color: '#94A3B8',
          ...style
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>
          Trey is Resting
        </div>
        <div style={{ fontSize: 13 }}>
          Start a focus session or PC takeover task to begin tracking.
        </div>
      </div>
    )
  }

  const remaining = session ? Math.max(0, session.duration - session.elapsed) : 0
  const progressPercent = session
    ? Math.min(100, Math.max(0, (session.elapsed / session.duration) * 100))
    : 100

  return (
    <div
      className={className}
      style={{
        background: '#121826',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: '20px 20px',
        opacity: isFresh ? 1 : 0.6,
        transition: 'opacity 0.3s ease',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        ...style
      }}
    >
      {/* Freshness Stale Warning */}
      {!isFresh && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: '6px 12px',
            marginBottom: 14,
            fontSize: 12,
            color: '#FCD34D',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span>Desktop connection stale (&gt;5s). Reconnecting in background...</span>
        </div>
      )}

      {/* Task Title & Clock */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6C86F5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            {takeoverActive ? '⚡ PC Takeover Active' : '🎯 Current Focus Task'}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#F8FAFC',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {session?.task || 'Autonomous Computer Task'}
          </div>
        </div>

        {session && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#F8FAFC', lineHeight: 1 }}>
              {formatClock(remaining)}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              {session.status.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {session && (
        <div
          style={{
            height: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 16
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #6C86F5, #38BDF8)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      )}

      {/* Active Step Thought & Action */}
      {activeStep && (
        <div
          style={{
            background: 'rgba(108, 134, 245, 0.08)',
            border: '1px solid rgba(108, 134, 245, 0.2)',
            borderRadius: 14,
            padding: '12px 14px',
            marginTop: 8
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#A9BCFF', marginBottom: 4 }}>
            Step {activeStep.stepNumber}: {activeStep.thought}
          </div>
          <div style={{ fontSize: 12, color: '#F8FAFC' }}>
            Action: <code>{activeStep.actionDescription}</code>
          </div>
        </div>
      )}

      {/* Detail note */}
      {session?.detail && !activeStep && (
        <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginTop: 4 }}>
          {session.detail}
        </div>
      )}
    </div>
  )
}
