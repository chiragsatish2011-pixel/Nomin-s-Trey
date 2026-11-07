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

export default function App(): React.JSX.Element {
  const [nudge, setNudge] = useState<NudgePayload | null>(null)
  const [report, setReport] = useState<ResearchReportPayload | null>(null)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [nudgeVisible, setNudgeVisible] = useState(false)

  useEffect(() => {
    const api = (window as unknown as {
      overlayAPI?: {
        onNudge: (cb: (payload: NudgePayload) => void) => () => void
        onReport: (cb: (payload: ResearchReportPayload) => void) => () => void
        setIgnoreMouseEvents: (ignore: boolean) => void
        openExternal: (url: string) => Promise<void>
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

    return () => {
      unsubNudge()
      unsubReport()
    }
  }, [])

  const handleCardMouseEnter = (): void => {
    const api = (window as unknown as {
      overlayAPI?: { setIgnoreMouseEvents: (ignore: boolean) => void }
    }).overlayAPI
    api?.setIgnoreMouseEvents(false)
  }

  const handleCardMouseLeave = (): void => {
    const api = (window as unknown as {
      overlayAPI?: { setIgnoreMouseEvents: (ignore: boolean) => void }
    }).overlayAPI
    api?.setIgnoreMouseEvents(true)
  }

  const handleOpenSource = (url: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    const api = (window as unknown as {
      overlayAPI?: { openExternal: (url: string) => Promise<void> }
    }).overlayAPI
    if (api && url) {
      void api.openExternal(url)
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
      {/* 0. CINEMATIC SCREEN TAKEOVER BACKDROP VIGNETTE */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(14, 10, 26, 0.45) 0%, rgba(6, 4, 12, 0.78) 100%)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: nudgeVisible ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.35s ease-out',
          zIndex: 9980
        }}
      />

      {/* 1. AGENTIC TOP-RIGHT RESEARCH REPORT PANEL */}
      {report && (
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
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
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#60A5FA',
                  boxShadow: '0 0 8px #60A5FA'
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
              >
                Research Report
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setReport(null)
                handleCardMouseLeave()
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                lineHeight: 1
              }}
              title="Close report"
            >
              ✕
            </button>
          </div>

          {/* Question / Query */}
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 6,
              fontWeight: 500
            }}
          >
            "{report.question}"
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: 17,
              fontWeight: 600,
              lineHeight: 1.35,
              color: '#FFFFFF'
            }}
          >
            {report.title}
          </h3>

          {/* Paragraphs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {(reportExpanded ? report.paragraphs : report.paragraphs.slice(0, 1)).map((para, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'rgba(255, 255, 255, 0.85)'
                }}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Expand Hint */}
          {!reportExpanded && report.paragraphs.length > 1 && (
            <div
              style={{
                fontSize: 12,
                color: '#60A5FA',
                fontWeight: 500,
                marginBottom: 10
              }}
            >
              Click card to expand ({report.paragraphs.length} paragraphs) ↓
            </div>
          )}

          {/* Sources */}
          {report.sources && report.sources.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sources
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {report.sources.map((src, i) => (
                  <button
                    key={i}
                    onClick={(e) => handleOpenSource(src.url, e)}
                    style={{
                      background: 'rgba(96, 165, 250, 0.15)',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                      color: '#93C5FD',
                      borderRadius: 12,
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                  >
                    ↗ {src.title || src.url}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. GLOWING LASER BEAM (Streams from bottom center to target) */}
      {cursorPos && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9992
          }}
        >
          <defs>
            <linearGradient id="laserGrad" x1="50%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#6C86F5" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="1" />
            </linearGradient>
            <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <line
            x1={window.innerWidth / 2}
            y1={window.innerHeight}
            x2={cursorPos.x}
            y2={cursorPos.y}
            stroke="url(#laserGrad)"
            strokeWidth="3.5"
            strokeDasharray="10 6"
            filter="url(#laserGlow)"
            style={{ animation: 'laserFlow 1s linear infinite' }}
          />
        </svg>
      )}

      {/* 3. TARGET GLOWING SPOTLIGHT BOX */}
      {cursorPos && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            width: nudge?.target?.width || 160,
            height: nudge?.target?.height || 48,
            transform: 'translate(-50%, -50%)',
            borderRadius: 12,
            border: '2.5px solid #6C86F5',
            boxShadow:
              '0 0 30px #6C86F5, 0 0 60px rgba(108, 134, 245, 0.6), inset 0 0 20px rgba(108, 134, 245, 0.3)',
            pointerEvents: 'none',
            zIndex: 10000,
            animation: 'targetPulse 1.6s ease-in-out infinite alternate'
          }}
        >
          {/* Corner crosshair accents */}
          <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderTop: '3px solid #FFFFFF', borderLeft: '3px solid #FFFFFF' }} />
          <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderTop: '3px solid #FFFFFF', borderRight: '3px solid #FFFFFF' }} />
          <div style={{ position: 'absolute', bottom: -4, left: -4, width: 10, height: 10, borderBottom: '3px solid #FFFFFF', borderLeft: '3px solid #FFFFFF' }} />
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, borderBottom: '3px solid #FFFFFF', borderRight: '3px solid #FFFFFF' }} />
        </div>
      )}

      {/* 4. FLUID POINTER ARROW (Flies in directly at target) */}
      {cursorPos && (
        <div
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.75s cubic-bezier(0.16, 1, 0.3, 1), top 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
            zIndex: 10002
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 54,
              height: 54,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '2px solid rgba(96, 165, 250, 0.85)',
              animation: 'pulseRing 1.4s infinite'
            }}
          />
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.8))' }}>
            <path
              d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
              fill="#3B82F6"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* 5. ULTRA-VISIBLE HIGH-CONTRAST POPUP MESSAGE BUBBLE */}
      {nudge && (
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          style={{
            position: 'absolute',
            top: 48,
            left: '50%',
            transform: nudgeVisible
              ? 'translateX(-50%) translateY(0) scale(1)'
              : 'translateX(-50%) translateY(-24px) scale(0.92)',
            maxWidth: 660,
            width: '90%',
            padding: '20px 28px',
            background: 'rgba(18, 14, 28, 0.96)',
            backdropFilter: 'blur(36px) saturate(200%)',
            WebkitBackdropFilter: 'blur(36px) saturate(200%)',
            border: '2px solid rgba(108, 134, 245, 0.9)',
            borderRadius: 24,
            boxShadow:
              '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(108, 134, 245, 0.55), inset 0 0 20px rgba(108, 134, 245, 0.2)',
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
          {/* Animated Mascot Badge */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C86F5 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(108, 134, 245, 0.85)',
              flexShrink: 0,
              fontSize: 24
            }}
          >
            🫐
          </div>

          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#A9BCFF'
                }}
              >
                Trey Focus Companion
              </span>
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.45,
                color: '#FFFFFF',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
              }}
            >
              {nudge.message}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => {
              setNudgeVisible(false)
              setTimeout(() => {
                setNudge(null)
                setCursorPos(null)
              }, 300)
            }}
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s ease'
            }}
          >
            Got it ✓
          </button>
        </div>
      )}

      <style>{`
        @keyframes laserFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -32; }
        }
        @keyframes targetPulse {
          0% {
            box-shadow: 0 0 25px #6C86F5, 0 0 50px rgba(108, 134, 245, 0.5), inset 0 0 15px rgba(108, 134, 245, 0.2);
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            box-shadow: 0 0 45px #38BDF8, 0 0 90px rgba(56, 189, 248, 0.8), inset 0 0 25px rgba(56, 189, 248, 0.4);
            transform: translate(-50%, -50%) scale(1.03);
          }
        }
        @keyframes pulseRing {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
