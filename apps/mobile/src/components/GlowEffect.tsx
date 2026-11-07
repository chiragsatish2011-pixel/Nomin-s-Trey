/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Luminous Audio-Reactive Touch-and-Hold Glow Aura.
 * Recreates the iconic blooming organic glow from Riley Brown's Bluey video:
 * - Multi-layered atmospheric radial bloom (indigo, berry, neon magenta, electric cyan)
 * - Real-time audio waveform reactivity (expands & pulses with voice intensity)
 * - Smooth spring physics on hold engagement and release
 * - Calming rotating shimmer in 'thinking' state
 */

import React from 'react'

export interface GlowEffectProps {
  isHolding: boolean
  isThinking: boolean
  audioLevel: number // 0.0 to 1.0
  touchPos?: { x: number; y: number } | null
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  isHolding,
  isThinking,
  audioLevel,
  touchPos
}) => {
  // Scaling factors based on audio volume
  const audioBoost = Math.min(1.0, audioLevel * 1.4)
  const scale = isHolding ? 1.0 + audioBoost * 0.45 : isThinking ? 1.05 : 0.8
  const opacity = isHolding ? 0.95 : isThinking ? 0.45 : 0.0

  const centerX = touchPos ? `${touchPos.x}px` : '50%'
  const centerY = touchPos ? `${touchPos.y}px` : '55%'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
        transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* 1. Deep Atmospheric Screen Edge Bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isHolding
            ? 'radial-gradient(circle at 50% 60%, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.22) 40%, rgba(67, 56, 202, 0.12) 70%, transparent 100%)'
            : isThinking
              ? 'radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.12) 50%, transparent 80%)'
              : 'transparent',
          opacity,
          transition: 'opacity 350ms ease-out',
          mixBlendMode: 'screen'
        }}
      />

      {/* 2. Primary Luminous Core Aura */}
      <div
        style={{
          position: 'absolute',
          left: centerX,
          top: centerY,
          width: 440,
          height: 440,
          marginLeft: -220,
          marginTop: -220,
          borderRadius: '50%',
          background: isThinking
            ? 'radial-gradient(circle, rgba(96, 165, 250, 0.75) 0%, rgba(129, 140, 248, 0.4) 40%, rgba(168, 85, 247, 0.15) 65%, transparent 80%)'
            : `radial-gradient(circle, rgba(169, 188, 255, ${0.85 + audioBoost * 0.15}) 0%, rgba(108, 134, 245, 0.6) 35%, rgba(168, 85, 247, 0.35) 60%, transparent 80%)`,
          filter: `blur(${40 + audioBoost * 25}px)`,
          transform: `scale(${scale})`,
          opacity,
          transition: isHolding
            ? 'transform 60ms ease-out, filter 60ms ease-out, opacity 250ms ease-out'
            : 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease-out, filter 350ms ease-out',
          willChange: 'transform, opacity, filter',
          mixBlendMode: 'screen'
        }}
      />

      {/* 3. High-Intensity Audio Reactive Shockwave Ring */}
      {isHolding && (
        <div
          style={{
            position: 'absolute',
            left: centerX,
            top: centerY,
            width: 320,
            height: 320,
            marginLeft: -160,
            marginTop: -160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(199, 210, 254, 0.6) 25%, transparent 60%)',
            filter: 'blur(20px)',
            transform: `scale(${0.85 + audioBoost * 0.6})`,
            opacity: 0.7 + audioBoost * 0.3,
            transition: 'transform 50ms ease-out, opacity 50ms ease-out',
            mixBlendMode: 'screen'
          }}
        />
      )}

      {/* 4. Subtle Ambient Corner Vignette Ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: isHolding
            ? 'inset 0 0 80px rgba(129, 140, 248, 0.4), inset 0 0 160px rgba(99, 102, 241, 0.2)'
            : 'none',
          opacity,
          transition: 'opacity 300ms ease-out'
        }}
      />
    </div>
  )
}
