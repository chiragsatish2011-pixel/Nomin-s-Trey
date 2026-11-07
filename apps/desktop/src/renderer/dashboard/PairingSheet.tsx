/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Mobile Companion Pairing & Device Management Sheet for Trey Desktop Dashboard.
 */

import React, { useState, useEffect } from 'react'
import { QRCodeView } from '../components/QRCodeView'
import { CloseIcon, SmartphoneIcon, ShieldIcon } from '../components/Icons'

interface PairedDevice {
  id: string
  name: string
  fingerprint: string
  pairedAt: number
  revoked: boolean
}

interface PairingSheetProps {
  onClose: () => void
}

export const PairingSheet: React.FC<PairingSheetProps> = ({ onClose }) => {
  const [qrText, setQrText] = useState<string>('')
  const [fingerprint, setFingerprint] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<number>(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300)
  const [loading, setLoading] = useState<boolean>(true)
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([])
  const [companionStatus, setCompanionStatus] = useState<{ count: number; names: string[] }>({
    count: 0,
    names: []
  })

  // Load pairing session
  const generateNewSession = async () => {
    setLoading(true)
    try {
      // @ts-expect-error dashboardAPI is exposed in preload
      const res = await window.dashboardAPI.startPairing()
      setQrText(res.qrText)
      setFingerprint(res.fingerprint)
      setExpiresAt(res.expiresAt)
      setSecondsRemaining(Math.max(0, Math.round((res.expiresAt - Date.now()) / 1000)))
    } catch (err) {
      console.error('[PairingSheet] Failed to start pairing session:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load paired devices
  const loadDevices = async () => {
    try {
      // @ts-expect-error dashboardAPI is exposed in preload
      const devices = await window.dashboardAPI.getPairedDevices()
      setPairedDevices(devices || [])
      // @ts-expect-error dashboardAPI is exposed in preload
      const status = await window.dashboardAPI.getCompanionStatus()
      setCompanionStatus(status)
    } catch (err) {
      console.error('[PairingSheet] Failed to load paired devices:', err)
    }
  }

  useEffect(() => {
    generateNewSession()
    loadDevices()

    // @ts-expect-error dashboardAPI is exposed in preload
    const unsub = window.dashboardAPI.onCompanionStatus?.((status) => {
      setCompanionStatus(status)
      loadDevices()
    })

    return () => {
      if (unsub) unsub()
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      setSecondsRemaining(left)
      if (left === 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const handleRevoke = async (id: string) => {
    try {
      // @ts-expect-error dashboardAPI is exposed in preload
      await window.dashboardAPI.revokeDevice(id)
      await loadDevices()
    } catch (err) {
      console.error('[PairingSheet] Revoke error:', err)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#121826',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(108, 134, 245, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(108, 134, 245, 0.15)',
                color: '#6C86F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SmartphoneIcon size={20} color="#6C86F5" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC' }}>
                Pair Android Companion
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                Control Trey, sync character state, and monitor tasks from your phone
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active Connection Banner if connected */}
          {companionStatus.count > 0 && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
              <div style={{ fontSize: 13, color: '#A7F3D0', fontWeight: 600 }}>
                Live Connection Active: {companionStatus.names.join(', ')} ({companionStatus.count} phone{companionStatus.count > 1 ? 's' : ''})
              </div>
            </div>
          )}

          {/* QR Code Presentation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 18,
              padding: 24
            }}
          >
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                Generating secure pairing secret...
              </div>
            ) : qrText && secondsRemaining > 0 ? (
              <>
                <QRCodeView value={qrText} size={210} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 600, marginBottom: 4 }}>
                    Scan with Trey on your Android phone
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Expires in <strong style={{ color: secondsRemaining < 60 ? '#EF4444' : '#6C86F5' }}>{secondsRemaining}s</strong> · Single-use pairing key
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 14, color: '#F87171', fontWeight: 600, marginBottom: 8 }}>
                  Pairing code expired
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
                  Pairing codes expire after 5 minutes for security.
                </div>
                <button
                  onClick={generateNewSession}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    background: '#6C86F5',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Generate New QR Code
                </button>
              </div>
            )}

            {/* Fingerprint & Security Note */}
            {fingerprint && (
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: 'rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ShieldIcon size={12} color="#6C86F5" />
                Discovery Fingerprint: {fingerprint}
              </div>
            )}
          </div>

          {/* Paired Devices List */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginBottom: 12 }}>
              Authorized Companion Devices
            </div>
            {pairedDevices.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                No phones currently paired.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pairedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: dev.revoked ? '#94A3B8' : '#F8FAFC' }}>
                        {dev.name} {dev.revoked && <span style={{ color: '#EF4444', fontSize: 11 }}>(Revoked)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                        Fingerprint: {dev.fingerprint.slice(0, 12)}… · Paired {new Date(dev.pairedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {!dev.revoked && (
                      <button
                        onClick={() => handleRevoke(dev.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#F87171',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
