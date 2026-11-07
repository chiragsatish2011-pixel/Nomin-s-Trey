/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Overlay renderer with Blue Pointer Cursor, Click Ripples, and Takeover status banner.
 */

import React, { useEffect, useState } from 'react'
import { playChirp } from './chirp'

interface NudgePayload {
  message: string
  target?: {
    x: number
    y: number
    width?: number
    height?: number
    text?: string
  }
}

interface ResearchReportPayload {
  question: string
  title: string
  paragraphs: string[]
  sources: Array<{ title: string; url: string }>
  takeaway: string
}

interface TakeoverStatusPayload {
  active: boolean
  task?: string
  step?: number
  maxSteps?: number
  thought?: string
}

interface RippleState {
  id: number
  x: number
  y: number
  button: 'left' | 'right' | 'middle'
}

export default function App(): React.JSX.Element {
  const [nudge, setNudge] = useState<NudgePayload | null>(null)
  const [report, setReport] = useState<ResearchReportPayload | null>(null)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [nudgeVisible, setNudgeVisible] = useState(false)

  // Autonomous PC Takeover State
  const [takeover, setTakeover] = useState<TakeoverStatusPayload>({ active: false })
  const [ripples, setRipples] = useState<RippleState[]>([])
  const [cursorAngle, setCursorAngle] = useState(0)
  const [cursorSquish, setCursorSquish] = useState(false)

  useEffect(() => {
    const api = (window as unknown as {
      overlayAPI?: {
        onNudge: (cb: (payload: NudgePayload) => void) => () => void
        onReport: (cb: (payload: ResearchReportPayload) => void) => () => void
        onTakeoverStatus: (cb: (status: TakeoverStatusPayload) => void) => () => void
        onAnimateCursor: (cb: (data: { x: number; y: number; actionType: string; durationMs?: number }) => void) => () => void
        onTriggerRipple: (cb: (data: { x: number; y: number; button?: 'left' | 'right' | 'middle' }) => void) => () => void
        setIgnoreMouseEvents: (ignore: boolean) => void
        openExternal: (url: string) => Promise<void>
        stopTakeover: () => Promise<void>
      }
    }).overlayAPI

    if (!api) return

    const unsubNudge = api.onNudge((data) => {
      playChirp(0.9, 3)
      setNudge(data)
      setNudgeVisible(true)

      if (data.target) {
        setCursorPos({ x: window.innerWidth - 180, y: window.innerHeight - 140 })
        setTimeout(() => {
          if (data.target) {
            setCursorPos({ x: data.target.x, y: data.target.y })
          }
        }, 50)
      } else {
        setCursorPos(null)
      }

      const timer = setTimeout(() => {
        setNudgeVisible(false)
        setTimeout(() => {
          setNudge(null)
          setCursorPos(null)
        }, 400)
      }, 9000)

      return () => clearTimeout(timer)
    })

    const unsubReport = api.onReport((rep) => {
      playChirp(1.2, 4)
      setReport(rep)
      setReportExpanded(false)
    })

    const unsubTakeover = api.onTakeoverStatus?.((status) => {
      setTakeover(status)
      if (status.active) {
        playChirp(0.8, 2)
      } else {
        setCursorPos(null)
      }
    })

    const unsubAnimate = api.onAnimateCursor?.((data) => {
      // Travel to target
      setCursorPos((prev) => {
        if (prev) {
          const dx = data.x - prev.x
          const angle = Math.max(-0.2, Math.min(0.2, dx / 800))
          setCursorAngle(angle)
        }
        return { x: data.x, y: data.y }
      })

      // Squish effect on arrival
      setTimeout(() => {
        setCursorSquish(true)
        setTimeout(() => setCursorSquish(false), 200)
      }, data.durationMs ? data.durationMs - 100 : 350)
    })

    const unsubRipple = api.onTriggerRipple?.((data) => {
      const newRipple: RippleState = {
        id: Date.now() + Math.random(),
        x: data.x,
        y: data.y,
        button: data.button || 'left'
      }
      setRipples((prev) => [...prev.slice(-4), newRipple])
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 700)
    })

    return () => {
      unsubNudge()
      unsubReport()
      unsubTakeover?.()
      unsubAnimate?.()
      unsubRipple?.()
    }
  }, [])

  const handleInteractiveEnter = (): void => {
    const api = (window as unknown as {
      overlayAPI?: { setIgnoreMouseEvents: (ignore: boolean) => void }
    }).overlayAPI
    api?.setIgnoreMouseEvents(false)
  }

  const handleInteractiveLeave = (): void => {
    const api = (window as unknown as {
      overlayAPI?: { setIgnoreMouseEvents: (ignore: boolean) => void }
    }).overlayAPI
    api?.setIgnoreMouseEvents(true)
  }

  const handleStopTakeover = async (): Promise<void> => {
    const api = (window as unknown as {
      overlayAPI?: { stopTakeover: () => Promise<void> }
    }).overlayAPI
    if (api) {
      await api.stopTakeover()
      setTakeover({ active: false })
      setCursorPos(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* 0. CINEMATIC ACTIVE TAKEOVER AMBIENT GLOW */}
      {takeover.active && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            boxShadow: 'inset 0 0 100px rgba(108, 134, 245, 0.25)',
            border: '2px solid rgba(108, 134, 245, 0.4)',
            pointerEvents: 'none',
            zIndex: 9980
          }}
        />
      )}

      {/* 1. "TREY IS IN CONTROL" STATUS BANNER */}
      {takeover.active && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 24px',
            background: 'rgba(12, 10, 24, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(108, 134, 245, 0.7)',
            borderRadius: 999,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(108, 134, 245, 0.4)',
            color: '#FFFFFF',
            zIndex: 10010,
            pointerEvents: 'auto',
            animation: 'bannerSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Pulsing Mascot Orb */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C86F5 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: '0 0 16px #6C86F5'
            }}
          >
            🫐
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF' }}>
                Trey is in control
              </span>
              {takeover.step !== undefined && takeover.maxSteps !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#A9BCFF', background: 'rgba(108,134,245,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                  Step {takeover.step} / {takeover.maxSteps}
                </span>
              )}
            </div>
            {takeover.thought && (
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {takeover.thought}
              </span>
            )}
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={handleStopTakeover}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#EF4444',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'transform 0.15s ease'
            }}
          >
            <span>Stop (Ctrl+Alt+S)</span>
          </button>
        </div>
      )}

      {/* 2. BLUE POINTER CURSOR (Teardrop shape matching Riley Brown CursorOverlay.swift) */}
      {cursorPos && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            width: 72,
            height: 72,
            pointerEvents: 'none',
            zIndex: 10008,
            transform: `translate(-6px, -6px) rotate(${cursorAngle}rad) scale(${cursorSquish ? '0.9, 1.1' : '1.0'})`,
            transition: 'left 0.45s cubic-bezier(0.42, 0, 0.22, 1), top 0.45s cubic-bezier(0.42, 0, 0.22, 1), transform 0.2s ease-out',
            filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 18px rgba(108, 134, 245, 0.8))'
          }}
        >
          {/* Teardrop SVG with 3 rounded corners and sharp pointer origin at top-left */}
          <svg width="72" height="72" viewBox="0 0 96 96" fill="none">
            <defs>
              <linearGradient id="berryGradient" x1="24" y1="6" x2="72" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A9BCFF" />
                <stop offset="34%" stopColor="#6C86F5" />
                <stop offset="68%" stopColor="#4254D6" />
                <stop offset="100%" stopColor="#2B2F8F" />
              </linearGradient>
              <radialGradient id="berryShine" cx="29" cy="23" r="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Teardrop Body */}
            <path
              d="M 6 6 Q 48 0 72 24 A 36 36 0 0 1 72 72 A 36 36 0 0 1 24 72 Q 0 48 6 6 Z"
              fill="url(#berryGradient)"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Gloss Shine */}
            <ellipse cx="36" cy="28" rx="20" ry="14" fill="url(#berryShine)" transform="rotate(-25 36 28)" />

            {/* Mini Googly Eyes on Cursor */}
            <g transform="translate(38, 44)">
              {/* Left Eye */}
              <circle cx="0" cy="0" r="9" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <circle cx="-1" cy="1" r="4.5" fill="#17151F" />
              <circle cx="-2" cy="0" r="1.5" fill="#FFFFFF" />

              {/* Right Eye */}
              <circle cx="18" cy="0" r="9" fill="#FFFFFF" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              <circle cx="17" cy="1" r="4.5" fill="#17151F" />
              <circle cx="16" cy="0" r="1.5" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      )}

      {/* 3. CLICK RIPPLES & PARTICLE BURSTS */}
      {ripples.map((rip) => (
        <div
          key={rip.id}
          style={{
            position: 'absolute',
            left: rip.x,
            top: rip.y,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 10007
          }}
        >
          {/* Expanding Primary Ring */}
          <div
            style={{
              position: 'absolute',
              left: -38,
              top: -38,
              width: 76,
              height: 76,
              borderRadius: '50%',
              border: `3px solid ${rip.button === 'right' ? '#A855F7' : '#6C86F5'}`,
              animation: 'rippleExpand 0.65s cubic-bezier(0.2, 0.7, 0.3, 1) forwards'
            }}
          />

          {/* 6 Radial Burst Stars */}
          {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FFFFFF',
                boxShadow: '0 0 8px #6C86F5',
                transform: `rotate(${angle}deg) translate(40px)`,
                animation: 'starBurst 0.55s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
              }}
            />
          ))}
        </div>
      ))}

      {/* 4. RESEARCH REPORT PANEL */}
      {report && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          onClick={() => setReportExpanded(!reportExpanded)}
          style={{
            position: 'absolute',
            top: 28,
            right: 28,
            width: reportExpanded ? 480 : 380,
            maxHeight: '80vh',
            padding: '20px 24px',
            background: 'rgba(22, 22, 32, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 22,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 10000,
            overflowY: reportExpanded ? 'auto' : 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA', boxShadow: '0 0 8px #60A5FA' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                Research Report
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>{reportExpanded ? '▲ Collapse' : '▼ Expand'}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, marginBottom: 12 }}>{report.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 14 }}>
            {reportExpanded ? report.paragraphs.join('\n\n') : report.paragraphs[0]}
          </div>
          {report.takeaway && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(96, 165, 250, 0.12)', border: '1px solid rgba(96, 165, 250, 0.25)', fontSize: 12, color: '#93C5FD', fontWeight: 600 }}>
              💡 {report.takeaway}
            </div>
          )}
        </div>
      )}

      {/* 5. NUDGE BUBBLE */}
      {nudge && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          style={{
            position: 'absolute',
            top: 48,
            left: '50%',
            transform: nudgeVisible ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(-24px) scale(0.92)',
            maxWidth: 660,
            width: '90%',
            padding: '20px 28px',
            background: 'rgba(18, 14, 28, 0.96)',
            backdropFilter: 'blur(36px) saturate(200%)',
            WebkitBackdropFilter: 'blur(36px) saturate(200%)',
            border: '2px solid rgba(108, 134, 245, 0.9)',
            borderRadius: 24,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(108, 134, 245, 0.55)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            zIndex: 10005,
            opacity: nudgeVisible ? 1 : 0,
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#6C86F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🫐
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A9BCFF', marginBottom: 4 }}>
              Trey Focus Companion
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{nudge.message}</div>
          </div>
          <button
            onClick={() => {
              setNudgeVisible(false)
              setTimeout(() => {
                setNudge(null)
                setCursorPos(null)
              }, 300)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Got it ✓
          </button>
        </div>
      )}

      <style>{`
        @keyframes bannerSlideDown {
          0% { transform: translateX(-50%) translateY(-40px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes rippleExpand {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes starBurst {
          0% { opacity: 1; transform: rotate(var(--angle, 0deg)) translate(0px) scale(1); }
          100% { opacity: 0; transform: rotate(var(--angle, 0deg)) translate(48px) scale(0.2); }
        }
      `}</style>
    </div>
  )
}
