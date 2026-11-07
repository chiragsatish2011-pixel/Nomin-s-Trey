/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Client Connection Manager for Trey Mobile Companion.
 * Connects to Desktop Trey via authenticated, AES-256-GCM encrypted WebSocket stream.
 * Implements Bluey-inspired mutual HMAC challenge, ordered sequence replay defense,
 * 5-second heartbeat freshness monitoring, and exponential reconnection backoff.
 */

import {
  PairingRecord,
  WirePacket,
  base64ToBytes,
  bytesToBase64,
  computeProof,
  deriveSessionKeys,
  sealPacket,
  openPacket
} from '@nomin/protocol'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface CompanionConnectionListener {
  onStateChange: (state: ConnectionState) => void
  onFreshnessChange: (fresh: boolean) => void
  onPacket: (packet: WirePacket) => void
  onError: (err: string) => void
}

export class CompanionConnection {
  private record: PairingRecord | null = null
  private ws: WebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private listeners: Set<CompanionConnectionListener> = new Set()

  private sendKey: CryptoKey | null = null
  private receiveKey: CryptoKey | null = null
  private sentSeq = 0
  private receivedSeq = 0
  private authenticated = false

  private lastPacketReceivedAt = 0
  private freshnessCheckTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private isExplicitlyClosed = false

  addListener(listener: CompanionConnectionListener): () => void {
    this.listeners.add(listener)
    listener.onStateChange(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(newState: ConnectionState): void {
    this.state = newState
    for (const l of this.listeners) {
      l.onStateChange(newState)
    }
  }

  private setFreshness(fresh: boolean): void {
    for (const l of this.listeners) {
      l.onFreshnessChange(fresh)
    }
  }

  private notifyPacket(packet: WirePacket): void {
    for (const l of this.listeners) {
      l.onPacket(packet)
    }
  }

  private notifyError(err: string): void {
    for (const l of this.listeners) {
      l.onError(err)
    }
  }

  connect(record: PairingRecord): void {
    this.record = record
    this.isExplicitlyClosed = false
    this.reconnectAttempts = 0
    this.initiateConnection()
  }

  disconnect(): void {
    this.isExplicitlyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.freshnessCheckTimer) {
      clearInterval(this.freshnessCheckTimer)
      this.freshnessCheckTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setState('disconnected')
    this.setFreshness(false)
  }

  private initiateConnection(): void {
    if (!this.record || this.isExplicitlyClosed) return

    this.setState(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting')

    // Pick candidate host: prioritize first address in list, or fallback to localhost
    const hostCandidates = [...this.record.addresses]
    if (hostCandidates.length === 0) {
      hostCandidates.push('localhost')
    }

    // Try candidates in round-robin fashion according to attempt count
    const targetHost = hostCandidates[this.reconnectAttempts % hostCandidates.length]
    const targetPort = this.record.port || 59124
    const url = `ws://${targetHost}:${targetPort}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        // Connected! Awaiting server challenge...
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = async (event) => {
        const text = String(event.data).trim()
        if (!text) return

        if (!this.authenticated) {
          // Handshake step: server sends challenge
          try {
            const parsed = JSON.parse(text)
            if (parsed.challenge && this.record) {
              const challengeBytes = base64ToBytes(parsed.challenge)
              const secretBytes = base64ToBytes(this.record.secret)

              // 1. Compute HMAC proof
              const proofBytes = await computeProof(secretBytes, challengeBytes)
              const proofBase64 = bytesToBase64(proofBytes)

              // 2. Derive directional HKDF session keys
              const keys = await deriveSessionKeys(secretBytes, challengeBytes, false)
              this.sendKey = keys.sendKey
              this.receiveKey = keys.receiveKey
              this.sentSeq = 0
              this.receivedSeq = 0

              // 3. Send proof back to desktop
              const deviceName = navigator.userAgent.includes('Android')
                ? 'Android Device'
                : 'Mobile Companion'
              this.ws?.send(
                JSON.stringify({
                  proof: proofBase64,
                  deviceId: `phone_${navigator.userAgent.slice(0, 15)}`,
                  deviceName
                })
              )

              this.authenticated = true
              this.lastPacketReceivedAt = Date.now()
              this.setState('connected')
              this.setFreshness(true)
              this.startFreshnessMonitor()
            }
          } catch (err) {
            console.error('[CompanionConnection] Handshake failure:', err)
            this.ws?.close()
          }
        } else if (this.receiveKey) {
          // Encrypted line processing
          this.lastPacketReceivedAt = Date.now()
          this.setFreshness(true)
          try {
            const expectedSeq = this.receivedSeq
            this.receivedSeq += 1
            const packet = await openPacket(text, expectedSeq, this.receiveKey)
            this.notifyPacket(packet)
          } catch (err) {
            console.error('[CompanionConnection] Packet decryption or replay error:', err)
            this.notifyError('Packet dropped due to decryption or sequence mismatch.')
          }
        }
      }

      this.ws.onclose = () => {
        this.authenticated = false
        this.sendKey = null
        this.receiveKey = null
        this.setFreshness(false)

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect()
        } else {
          this.setState('disconnected')
        }
      }

      this.ws.onerror = () => {
        // WebSocket error triggers onclose automatically
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private startFreshnessMonitor(): void {
    if (this.freshnessCheckTimer) clearInterval(this.freshnessCheckTimer)

    // Check every 1000ms if packets have arrived in the last 5000ms (Requirement 4)
    this.freshnessCheckTimer = setInterval(() => {
      if (this.state === 'connected') {
        const age = Date.now() - this.lastPacketReceivedAt
        const isFresh = age <= 5000
        this.setFreshness(isFresh)
      }
    }, 1000)
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting')
    this.reconnectAttempts += 1
    // Exponential backoff: 1s, 2s, 4s, capped at 8s
    const backoffMs = Math.min(8000, 1000 * Math.pow(2, Math.min(3, this.reconnectAttempts - 1)))

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.initiateConnection()
    }, backoffMs)
  }

  async sendPacket(packet: WirePacket): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sendKey) {
      throw new Error('Not connected to desktop.')
    }
    const seq = this.sentSeq
    this.sentSeq += 1
    const sealed = await sealPacket(packet, seq, this.sendKey)
    this.ws.send(sealed)
  }

  async sendStop(reason = 'Emergency stop commanded from mobile'): Promise<void> {
    return this.sendPacket({
      type: 'stop',
      reason,
      timestamp: Date.now()
    })
  }

  async sendTaskStart(
    task: string,
    durationMinutes = 30,
    mode: 'focus' | 'takeover' = 'focus'
  ): Promise<void> {
    return this.sendPacket({
      type: 'task_start',
      task,
      durationMinutes,
      mode
    })
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.authenticated
  }

  isFresh(): boolean {
    return this.isConnected() && Date.now() - this.lastPacketReceivedAt <= 5000
  }
}

export const companionConnection = new CompanionConnection()
