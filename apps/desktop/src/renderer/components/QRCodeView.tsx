/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * QR Code Canvas Renderer for Trey Desktop Mobile Pairing.
 */

import React, { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeViewProps {
  value: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 220,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#0A0D14', // Sharp contrast dark blue/black
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }).catch((err) => {
      console.error('[QRCodeView] Render error:', err)
    })
  }, [value, size])

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(108, 134, 245, 0.25)',
        ...style
      }}
    >
      <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />
    </div>
  )
}
