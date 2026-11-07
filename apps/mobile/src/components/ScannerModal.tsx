/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Pairing Scanner Modal for Trey Mobile Companion.
 * Supports camera QR scanning and manual pairing code entry.
 */

import React, { useState, useEffect, useRef } from 'react'
import { parseQrText, PairingRecord } from '@nomin/protocol'
import { StorageService } from '../services/StorageService'
import { X, Camera, QrCode } from 'lucide-react'

interface ScannerModalProps {
  onClose: () => void
  onPaired: (record: PairingRecord) => void
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onPaired }) => {
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handlePairText = (text: string) => {
    setError(null)
    const record = parseQrText(text.trim())
    if (!record) {
      setError('Invalid or expired pairing code. Please generate a fresh code on your desktop.')
      return
    }

    StorageService.setPairingRecord(record)
    onPaired(record)
    onClose()
  }

  // Camera initialization
  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch {
      setError('Camera access denied or unavailable. Please paste your pairing code below.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
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
        background: 'rgba(10, 13, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 20
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108, 134, 245, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={18} color="#6C86F5" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>Pair with Desktop Trey</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Scan QR displayed on your computer</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F8FAFC',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera View or Placeholder */}
      <div
        style={{
          flex: 1,
          minHeight: 260,
          background: '#121826',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}
      >
        {cameraActive ? (
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(108, 134, 245, 0.12)', color: '#6C86F5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Camera size={26} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', marginBottom: 6 }}>
              Scan QR from Screen
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, maxWidth: 280 }}>
              Point your camera at Trey desktop (Dashboard → Pair Phone)
            </div>
            <button
              onClick={startCamera}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                background: '#6C86F5',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start Camera
            </button>
          </div>
        )}

        {/* Viewfinder Overlay Box */}
        {cameraActive && (
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              border: '2px solid #6C86F5',
              borderRadius: 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}
          />
        )}
      </div>

      {/* Manual Code Input Fallback */}
      <div
        style={{
          background: '#121826',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 16
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', marginBottom: 8 }}>
          Or Paste Pairing Code
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="trey-pair:..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '10px 12px',
              color: '#F8FAFC',
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handlePairText(manualCode)}
            style={{
              padding: '0 16px',
              borderRadius: 10,
              background: '#6C86F5',
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
    </div>
  )
}
