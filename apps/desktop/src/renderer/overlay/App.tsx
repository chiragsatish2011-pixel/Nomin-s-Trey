/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Overlay renderer with Blue Pointer Cursor, Click Ripples, Research Report Panel,
 * and Apple-style Takeover status HUD banner. Zero emojis, pure vector icons, zero glow.
 */

import React, { useEffect, useState } from 'react'
import { playChirp } from './chirp'
import { tokens } from '../tokens'
import {
  StopIcon,
  CheckIcon,
  MinusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TreyMascotIcon,
  FileTextIcon,
  ExternalLinkIcon,
  LightbulbIcon
} from '../components/Icons'

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
  takeaway?: string
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
  const [eyeLook, setEyeLook] = useState<{ x: number; y: number }>({ x: -0.7, y: -0.7 })

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
      setCursorPos((prev) => {
        if (prev) {
          const dx = data.x - prev.x
          const dy = data.y - prev.y
          const dist = Math.hypot(dx, dy)
          const angle = Math.max(-0.2, Math.min(0.2, dx / 800))
          setCursorAngle(angle)

          // Googly eye velocity tracking
          if (dist > 20) {
            setEyeLook({
              x: Math.max(-1, Math.min(1, (dx / dist) * 0.9)),
              y: Math.max(-1, Math.min(1, (dy / dist) * 0.9))
            })
          }
        }
        return { x: data.x, y: data.y }
      })

      // Arrival squish effect
      const travelTime = data.durationMs || 450
      setTimeout(() => {
        setCursorSquish(true)
        setEyeLook({ x: -0.7, y: -0.7 })
        setTimeout(() => setCursorSquish(false), 220)
      }, Math.max(50, travelTime - 60))
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

  const handleOpenUrl = async (url: string): Promise<void> => {
    const api = (window as unknown as {
      overlayAPI?: { openExternal: (url: string) => Promise<void> }
    }).overlayAPI
    if (api) {
      await api.openExternal(url)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        fontFamily: tokens.font.family
      }}
    >
      {/* 1. CINEMATIC TAKEOVER CLEAN BORDER (NO GLOW) */}
      {takeover.active && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            border: `2px solid ${tokens.colors.accent.primary}`,
            pointerEvents: 'none',
            zIndex: 9980
          }}
        />
      )}

      {/* 2. "TREY IS IN CONTROL" STATUS BANNER (APPLE PILL HUD) */}
      {takeover.active && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 20px',
            background: tokens.colors.surface.overlayBanner,
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: tokens.radii.pill,
            boxShadow: tokens.shadows.card,
            color: tokens.colors.text.primary,
            zIndex: 10010,
            pointerEvents: 'auto',
            animation: 'bannerSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Trey Vector Mascot Avatar */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(108, 134, 245, 0.15)',
              border: `1px solid ${tokens.colors.accent.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TreyMascotIcon size={18} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.text.primary, letterSpacing: '-0.01em' }}>
                Trey is in control
              </span>
              {takeover.step !== undefined && takeover.maxSteps !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: tokens.colors.accent.subtle,
                    background: 'rgba(108, 134, 245, 0.15)',
                    padding: '2px 8px',
                    borderRadius: tokens.radii.pill,
                    fontFamily: tokens.font.familyMono
                  }}
                >
                  Step {takeover.step} / {takeover.maxSteps}
                </span>
              )}
            </div>
            {takeover.thought && (
              <span
                style={{
                  fontSize: 11,
                  color: tokens.colors.text.secondary,
                  maxWidth: 440,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {takeover.thought}
              </span>
            )}
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={handleStopTakeover}
            style={{
              padding: '6px 14px',
              borderRadius: tokens.radii.pill,
              background: tokens.colors.status.danger,
              border: 'none',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'opacity 0.15s ease'
            }}
          >
            <StopIcon size={12} color="#FFFFFF" />
            <span>Stop (Ctrl+Alt+S)</span>
          </button>
        </div>
      )}

      {/* 3. BLUE POINTER CURSOR (Teardrop shape matching Riley Brown CursorOverlay.swift) */}
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
            transform: `translate(0px, 0px) rotate(${cursorAngle}rad) scale(${cursorSquish ? '0.88, 1.12' : '1.0'})`,
            transition: 'left 0.45s cubic-bezier(0.42, 0, 0.22, 1), top 0.45s cubic-bezier(0.42, 0, 0.22, 1), transform 0.18s ease-out',
            filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.45))'
          }}
        >
          {/* Teardrop SVG with 3 rounded corners and sharp pointer tip at (0, 0) */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <defs>
              <linearGradient id="berryGradient" x1="18" y1="4.8" x2="54" y2="67.2" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A9BCFF" />
                <stop offset="34%" stopColor="#6C86F5" />
                <stop offset="68%" stopColor="#4254D6" />
                <stop offset="100%" stopColor="#2B2F8F" />
              </linearGradient>
              <radialGradient id="berryShine" cx="21.6" cy="17.3" r="27.4" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Teardrop Contour: (0,0) tip, (72, 72) bounding */}
            <path
              d="M 4.5 0 L 36 0 A 36 36 0 0 1 72 36 A 36 36 0 0 1 36 72 A 36 36 0 0 1 0 36 L 0 4.5 A 4.5 4.5 0 0 1 4.5 0 Z"
              fill="url(#berryGradient)"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Radial Shine Highlight */}
            <path
              d="M 4.5 0 L 36 0 A 36 36 0 0 1 72 36 A 36 36 0 0 1 36 72 A 36 36 0 0 1 0 36 L 0 4.5 A 4.5 4.5 0 0 1 4.5 0 Z"
              fill="url(#berryShine)"
            />

            {/* Dual Googly Eyes on Cursor */}
            <g transform="translate(30.5, 30)">
              {/* Left Eye */}
              <circle cx="0" cy="0" r="6.75" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
              <circle cx={eyeLook.x * 2.5} cy={eyeLook.y * 2.5} r="3.35" fill="#17151F" />
              <circle cx={eyeLook.x * 2.5 - 1} cy={eyeLook.y * 2.5 - 1} r="1" fill="#FFFFFF" />

              {/* Right Eye */}
              <circle cx="18" cy="0" r="6.75" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
              <circle cx={18 + eyeLook.x * 2.5} cy={eyeLook.y * 2.5} r="3.35" fill="#17151F" />
              <circle cx={18 + eyeLook.x * 2.5 - 1} cy={eyeLook.y * 2.5 - 1} r="1" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      )}

      {/* 4. CLICK RIPPLES & 6-STAR PARTICLE BURSTS */}
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
          {/* Expanding Primary Ring (38px radius = 76px diameter) */}
          <div
            style={{
              position: 'absolute',
              left: -38,
              top: -38,
              width: 76,
              height: 76,
              borderRadius: '50%',
              border: `3.5px solid ${rip.button === 'right' ? '#4254D6' : '#6C86F5'}`,
              animation: 'rippleExpand 0.65s cubic-bezier(0.2, 0.7, 0.3, 1) forwards'
            }}
          />

          {/* 6 Radial Burst Stars */}
          {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: -4,
                top: -4,
                width: 8,
                height: 8,
                pointerEvents: 'none',
                transform: `rotate(${angle}deg)`,
                animation: 'starBurst 0.55s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
              }}
            >
              {/* 8-point SVG Star Particle */}
              <svg width="8" height="8" viewBox="-5 -5 10 10">
                <polygon
                  points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5"
                  fill={idx % 2 === 0 ? '#A9BCFF' : '#6C86F5'}
                />
              </svg>
            </div>
          ))}
        </div>
      ))}

      {/* 5. RESEARCH REPORT CARD (Top-Right Screen HUD matching ReportPanel.swift) */}
      {report && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            width: reportExpanded ? 520 : 400,
            maxHeight: '75vh',
            padding: 18,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF0FF 100%)',
            border: `2.5px solid ${tokens.colors.accent.primary}`,
            borderRadius: tokens.radii.card,
            boxShadow: tokens.shadows.bubble,
            color: tokens.colors.text.inverse,
            pointerEvents: 'auto',
            transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <FileTextIcon size={18} color={tokens.colors.accent.primary} />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: tokens.colors.text.inverse,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: reportExpanded ? 'normal' : 'nowrap'
                }}
              >
                {report.title || 'Research Report'}
              </div>
            </div>

            {/* Circular Actions: Chevron toggle & Minus close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setReportExpanded(!reportExpanded)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: tokens.colors.accent.primary,
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={reportExpanded ? 'Collapse' : 'Expand'}
              >
                {reportExpanded ? <ChevronUpIcon size={14} color="#FFFFFF" /> : <ChevronDownIcon size={14} color="#FFFFFF" />}
              </button>
              <button
                onClick={() => setReport(null)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: tokens.colors.accent.primary,
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Close"
              >
                <MinusIcon size={14} color="#FFFFFF" />
              </button>
            </div>
          </div>

          {/* Paragraph Body */}
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: tokens.colors.text.inverse,
              maxHeight: reportExpanded ? '45vh' : '68px',
              overflowY: reportExpanded ? 'auto' : 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: reportExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {reportExpanded ? (
              report.paragraphs.map((para, idx) => (
                <p key={idx} style={{ margin: '0 0 10px 0' }}>
                  {para}
                </p>
              ))
            ) : (
              report.paragraphs.join(' ')
            )}
          </div>

          {!reportExpanded && (
            <div
              onClick={() => setReportExpanded(true)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: tokens.colors.accent.primary,
                fontFamily: tokens.font.familyMono,
                cursor: 'pointer'
              }}
            >
              Click to read more
            </div>
          )}

          {/* Sources Section when expanded */}
          {reportExpanded && report.sources && report.sources.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(108, 134, 245, 0.25)', paddingTop: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: tokens.colors.text.inverseSubtle,
                  fontFamily: tokens.font.familyMono,
                  marginBottom: 6
                }}
              >
                SOURCES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.sources.map((src, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenUrl(src.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: tokens.colors.accent.primary,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <ExternalLinkIcon size={12} color={tokens.colors.accent.primary} />
                    <span style={{ textDecoration: 'underline' }}>{src.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaway Banner */}
          {report.takeaway && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: tokens.radii.sm,
                background: 'rgba(108, 134, 245, 0.12)',
                border: '1px solid rgba(108, 134, 245, 0.3)',
                fontSize: 12,
                color: tokens.colors.accent.deep,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <LightbulbIcon size={14} color={tokens.colors.accent.primary} />
              <span>{report.takeaway}</span>
            </div>
          )}
        </div>
      )}

      {/* 6. SPEECH BUBBLE / NUDGE (Matching CursorOverlay.swift:516-529, zero glow) */}
      {nudge && (
        <div
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          style={{
            position: 'absolute',
            top: 48,
            left: '50%',
            transform: nudgeVisible ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(-20px) scale(0.92)',
            maxWidth: 620,
            width: '90%',
            padding: '18px 24px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF0FF 100%)',
            border: `2.5px solid ${tokens.colors.accent.primary}`,
            borderRadius: tokens.radii.bubble,
            boxShadow: tokens.shadows.bubble,
            color: tokens.colors.text.inverse,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 10005,
            opacity: nudgeVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto'
          }}
        >
          {/* Downward Speech Bubble Tail pointing towards cursor/phone */}
          <div
            style={{
              position: 'absolute',
              bottom: -18,
              left: 48,
              width: 0,
              height: 0,
              borderLeft: '13px solid transparent',
              borderRight: '13px solid transparent',
              borderTop: `18px solid ${tokens.colors.accent.primary}`
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -21,
                left: -10,
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '15px solid #EEF0FF'
              }}
            />
          </div>

          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(108, 134, 245, 0.15)',
              border: `1px solid ${tokens.colors.accent.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <TreyMascotIcon size={24} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: tokens.colors.accent.primary,
                marginBottom: 2
              }}
            >
              Trey Focus Companion
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: tokens.colors.text.inverse, lineHeight: 1.4 }}>
              {nudge.message}
            </div>
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
              borderRadius: tokens.radii.pill,
              background: tokens.colors.accent.primary,
              border: 'none',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            }}
          >
            <CheckIcon size={14} color="#FFFFFF" />
            <span>Got it</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes bannerSlideDown {
          0% { transform: translateX(-50%) translateY(-40px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes rippleExpand {
          0% { transform: scale(0.3); opacity: 0.85; }
          100% { transform: scale(1.0); opacity: 0; }
        }
        @keyframes starBurst {
          0% { opacity: 1; transform: rotate(var(--angle, 0deg)) translate(0px) scale(1); }
          45% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle, 0deg)) translate(46px) scale(0.4); }
        }
      `}</style>
    </div>
  )
}
