/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Real-Time QR Scanner Modal for Trey Mobile Companion.
 * Uses hardware-accelerated BarcodeDetector with jsQR canvas fallback
 * for instantaneous QR code detection off computer displays.
 */

import React, { useState, useEffect, useRef } from 'react'
import { parseQrText, PairingRecord } from '@nomin/protocol'
import { StorageService } from '../services/StorageService'
import { voiceService } from '../services/VoiceService'
import jsQR from 'jsqr'
import { X, Camera, QrCode, CheckCircle2 } from 'lucide-react'

interface ScannerModalProps {
  onClose: () => void
  onPaired: (record: PairingRecord) => void
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onPaired }) => {
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)

  const handlePairText = (text: string) => {
    setError(null)
    const record = parseQrText(text.trim())
    if (!record) {
      setError('Invalid or expired pairing code. Please generate a fresh QR on your PC.')
      return
    }

    setSuccess(true)
    voiceService.triggerHaptic('tap')
    voiceService.playChirp(3, 'happy')
    StorageService.setPairingRecord(record)
    onPaired(record)

    setTimeout(() => {
      stopCamera()
      onClose()
    }, 450)
  }

  // Camera initialization and continuous detection loop
  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }
      setCameraActive(true)
      startScanningLoop()
    } catch {
      setError('Camera access denied or unavailable. You can paste the pairing text code below.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const startScanningLoop = () => {
    // Check if BarcodeDetector API is natively available
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window
    let barcodeDetector: { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null = null

    if (hasBarcodeDetector) {
      try {
        const BD = (window as unknown as { BarcodeDetector: new (opt: { formats: string[] }) => typeof barcodeDetector }).BarcodeDetector
        barcodeDetector = new BD({ formats: ['qr_code'] })
      } catch {
        barcodeDetector = null
      }
    }

    const checkFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(checkFrame)
        return
      }

      const video = videoRef.current

      // 1. Hardware accelerated detector
      if (barcodeDetector) {
        try {
          const codes = await barcodeDetector.detect(video)
          if (codes && codes.length > 0 && codes[0].rawValue) {
            handlePairText(codes[0].rawValue)
            return
          }
        } catch {
          // Fall back to jsQR
        }
      }

      // 2. jsQR Canvas fallback
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          canvas.width = Math.min(video.videoWidth || 640, 480)
          canvas.height = Math.min(video.videoHeight || 480, 360)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          })
          if (code && code.data) {
            handlePairText(code.data)
            return
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(checkFrame)
    }

    scanLoopRef.current = requestAnimationFrame(checkFrame)
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'env(safe-area-inset-top) 20px env(safe-area-inset-bottom) 20px',
        color: '#FFFFFF'
      }}
    >
      {/* Hidden offscreen canvas for frame sampling */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(108, 134, 245, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <QrCode size={20} color="#818CF8" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Pair with PC</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Scan QR shown on Trey desktop</div>
          </div>
        </div>
        <button
          onClick={() => {
            stopCamera()
            onClose()
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera Viewfinder */}
      <div
        style={{
          flex: 1,
          minHeight: 280,
          background: '#0B0F19',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {cameraActive ? (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: 'rgba(108, 134, 245, 0.15)',
                color: '#818CF8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}
            >
              <Camera size={28} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Camera Scanner
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 18, maxWidth: 260 }}>
              Point at Trey Dashboard on your PC
            </div>
            <button
              onClick={startCamera}
              style={{
                padding: '12px 24px',
                borderRadius: 99,
                background: '#6366F1',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start Camera
            </button>
          </div>
        )}

        {/* Viewfinder Target Reticle with Scanner Bar */}
        {cameraActive && !success && (
          <div
            style={{
              position: 'absolute',
              width: 220,
              height: 220,
              border: '2px solid rgba(129, 140, 248, 0.8)',
              borderRadius: 24,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Animated Scanning Laser Line */}
            <div
              style={{
                width: '90%',
                height: 2,
                background: 'linear-gradient(90deg, transparent, #818CF8, #A855F7, transparent)',
                boxShadow: '0 0 12px #818CF8',
                animation: 'scanLaser 2s ease-in-out infinite'
              }}
            />
          </div>
        )}

        {/* Success confirmation checkmark */}
        {success && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(16, 185, 129, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12
            }}
          >
            <CheckCircle2 size={56} color="#FFFFFF" />
            <div style={{ fontSize: 18, fontWeight: 700 }}>Paired Successfully!</div>
          </div>
        )}
      </div>

      {/* Manual Code Fallback */}
      <div
        style={{
          marginTop: 18,
          marginBottom: 12,
          background: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 18,
          padding: 16
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>
          Manual Pairing Text
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Paste trey-pair:... text code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePairText(manualCode)}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 12,
              padding: '12px 14px',
              color: '#FFFFFF',
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handlePairText(manualCode)}
            style={{
              padding: '0 18px',
              borderRadius: 12,
              background: '#6366F1',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Pair
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#F87171' }}>
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLaser {
          0%, 100% { transform: translateY(-80px); opacity: 0.3; }
          50% { transform: translateY(80px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
