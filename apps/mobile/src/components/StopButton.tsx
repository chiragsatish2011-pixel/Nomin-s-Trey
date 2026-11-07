/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Full-width, prominent 64dp emergency STOP button with haptic feedback.
 */

import React, { useState } from 'react'

interface StopButtonProps {
  onStop: () => void
  disabled?: boolean
  label?: string
  className?: string
  style?: React.CSSProperties
}

export const StopButton: React.FC<StopButtonProps> = ({
  onStop,
  disabled = false,
  label = 'STOP (Emergency Abort)',
  className,
  style
}) => {
  const [pressed, setPressed] = useState(false)

  const handleTrigger = () => {
    if (disabled) return

    // Haptic feedback
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100])
      } catch {
        // ignore
      }
    }

    onStop()
  }

  return (
    <button
      onClick={handleTrigger}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      aria-label="Emergency Stop Task"
      className={className}
      style={{
        width: '100%',
        height: 64,
        borderRadius: 20,
        background: disabled
          ? 'rgba(239, 68, 68, 0.2)'
          : pressed
            ? '#DC2626'
            : 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
        border: 'none',
        boxShadow: disabled
          ? 'none'
          : pressed
            ? '0 2px 10px rgba(239, 68, 68, 0.4)'
            : '0 8px 24px rgba(239, 68, 68, 0.45)',
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s ease, background 0.15s ease',
        ...style
      }}
    >
      <span style={{ fontSize: 22 }}>🛑</span>
      <span>{label}</span>
    </button>
  )
}
