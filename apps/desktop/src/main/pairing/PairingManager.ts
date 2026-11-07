/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Ephemeral QR Pairing Manager for Trey Desktop.
 * Generates single-use, time-limited (5-minute) pairing credentials and manages paired devices.
 */

import os from 'os'
import {
  PROTOCOL_VERSION,
  PairingRecord,
  formatQrText,
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  computeIdentifier
} from '@nomin/protocol'
import { loadSettings, saveSettings, PairedDeviceRecord } from '../store.js'

export interface ActivePairingSession {
  secretBytes: Uint8Array
  secretBase64: string
  fingerprint: string
  port: number
  addresses: string[]
  expiresAt: number
}

export class PairingManager {
  private activeSession: ActivePairingSession | null = null
  private defaultPort: number

  constructor(defaultPort = 59124) {
    this.defaultPort = defaultPort
  }

  private getLocalIpAddresses(): string[] {
    const interfaces = os.networkInterfaces()
    const addresses: string[] = []

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name]
      if (!iface) continue
      for (const info of iface) {
        // Skip IPv6 and internal loopback 127.0.0.1
        if (info.family === 'IPv4' && !info.internal) {
          addresses.push(info.address)
        }
      }
    }

    // Sort to prioritize Tailscale (100.x.y.z) and standard LAN (192.168.x.y, 10.x.y.z)
    addresses.sort((a, b) => {
      if (a.startsWith('100.')) return -1
      if (b.startsWith('100.')) return 1
      if (a.startsWith('192.168.')) return -1
      if (b.startsWith('192.168.')) return 1
      return 0
    })

    return addresses
  }

  async startPairingSession(port = this.defaultPort): Promise<{
    record: PairingRecord
    qrText: string
    fingerprint: string
    expiresAt: number
  }> {
    const secretBytes = getRandomBytes(32)
    const secretBase64 = bytesToBase64(secretBytes)
    const fingerprint = await computeIdentifier(secretBytes)
    const addresses = this.getLocalIpAddresses()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes TTL

    const hostname = os.hostname() || 'Trey-PC'
    const service = `${hostname}.local`

    const record: PairingRecord = {
      version: PROTOCOL_VERSION,
      service,
      secret: secretBase64,
      port,
      addresses,
      expiresAt
    }

    this.activeSession = {
      secretBytes,
      secretBase64,
      fingerprint,
      port,
      addresses,
      expiresAt
    }

    const qrText = formatQrText(record)
    return { record, qrText, fingerprint, expiresAt }
  }

  getActiveSession(): ActivePairingSession | null {
    if (!this.activeSession) return null
    if (Date.now() > this.activeSession.expiresAt) {
      this.activeSession = null
      return null
    }
    return this.activeSession
  }

  consumeActiveSession(): ActivePairingSession | null {
    const session = this.getActiveSession()
    this.activeSession = null
    return session
  }

  getPairedDevices(): PairedDeviceRecord[] {
    const settings = loadSettings()
    return settings.pairedDevices || []
  }

  savePairedDevice(device: PairedDeviceRecord): void {
    const settings = loadSettings()
    const devices = (settings.pairedDevices || []).filter((d) => d.id !== device.id)
    devices.push(device)
    saveSettings({ ...settings, pairedDevices: devices })
  }

  revokeDevice(deviceId: string): boolean {
    const settings = loadSettings()
    let found = false
    const devices = (settings.pairedDevices || []).map((d) => {
      if (d.id === deviceId) {
        found = true
        return { ...d, revoked: true }
      }
      return d
    })
    if (found) {
      saveSettings({ ...settings, pairedDevices: devices })
    }
    return found
  }

  findSecretForDevice(deviceIdOrFingerprint: string): { secretBytes: Uint8Array; device: PairedDeviceRecord } | null {
    const devices = this.getPairedDevices()
    const device = devices.find(
      (d) => !d.revoked && (d.id === deviceIdOrFingerprint || d.fingerprint === deviceIdOrFingerprint)
    )
    if (!device) return null
    try {
      const secretBytes = base64ToBytes(device.secretBase64)
      return { secretBytes, device }
    } catch {
      return null
    }
  }
}
