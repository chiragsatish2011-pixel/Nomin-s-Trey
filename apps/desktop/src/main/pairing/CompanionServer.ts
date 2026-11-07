/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Secure Dual TCP & WebSocket Companion Server for Trey Desktop.
 * Implements Bluey-inspired mutual authentication, HKDF key derivation,
 * ordered AES-256-GCM framing with sequence counters, and state synchronization.
 * Supports both direct raw TCP clients and mobile/Capacitor WebSocket clients on the same port.
 */

import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import {
  WirePacket,
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  verifyProof,
  deriveSessionKeys,
  sealPacket,
  openPacket
} from '@nomin/protocol'
import { PairingManager } from './PairingManager.js'

export interface ConnectedCompanion {
  id: string
  name: string
  remoteAddress: string
  sendKey: CryptoKey
  receiveKey: CryptoKey
  sentSeq: number
  receivedSeq: number
  lastActive: number
  sendRaw: (msg: string) => void
  close: () => void
}

export interface CompanionServerCallbacks {
  onStopRequested: (reason: string) => void
  onTaskStartRequested: (task: string, durationMinutes: number, mode: 'focus' | 'takeover') => void
  onClientCountChanged: (count: number, names: string[]) => void
}

export class CompanionServer {
  private httpServer: http.Server | null = null
  private wss: WebSocketServer | null = null
  private pairingManager: PairingManager
  private callbacks: CompanionServerCallbacks
  private port: number
  private clients = new Map<unknown, ConnectedCompanion>()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(
    pairingManager: PairingManager,
    callbacks: CompanionServerCallbacks,
    port = 59124
  ) {
    this.pairingManager = pairingManager
    this.callbacks = callbacks
    this.port = port
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        // Optional status endpoint for local network health check
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', name: 'Trey-Desktop', port: this.port }))
        } else {
          res.writeHead(404)
          res.end()
        }
      })

      this.wss = new WebSocketServer({ server: this.httpServer })

      this.wss.on('connection', (ws, req) => {
        const remoteAddress = req.socket.remoteAddress || 'unknown'
        this.handleWsConnection(ws, remoteAddress)
      })

      this.httpServer.on('error', (err) => {
        console.error('[CompanionServer] HTTP/WS server error:', err)
        reject(err)
      })

      this.httpServer.listen(this.port, '0.0.0.0', () => {
        const addr = this.httpServer?.address()
        const assignedPort = typeof addr === 'object' && addr ? addr.port : this.port
        this.port = assignedPort
        console.log(`[CompanionServer] Listening on 0.0.0.0:${this.port} (HTTP & WebSocket)`)

        // Start heartbeat broadcast every 2000ms
        this.heartbeatInterval = setInterval(() => {
          this.broadcast({
            type: 'heartbeat',
            timestamp: Date.now(),
            uptime: process.uptime()
          })
        }, 2000)

        resolve(this.port)
      })
    })
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    for (const companion of this.clients.values()) {
      companion.close()
    }
    this.clients.clear()

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    if (this.httpServer) {
      this.httpServer.close()
      this.httpServer = null
    }
  }

  getPort(): number {
    return this.port
  }

  getConnectedClientsCount(): number {
    return this.clients.size
  }

  getConnectedClientNames(): string[] {
    return Array.from(this.clients.values()).map((c) => c.name || 'Mobile Companion')
  }

  private handleWsConnection(ws: WebSocket, remoteAddress: string): void {
    let authenticated = false
    let companion: ConnectedCompanion | null = null

    // 1. Generate fresh 32-byte challenge
    const challengeBytes = getRandomBytes(32)
    const challengeBase64 = bytesToBase64(challengeBytes)

    // Send challenge to client
    ws.send(JSON.stringify({ challenge: challengeBase64 }))

    // 8-second handshake timeout
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.warn(`[CompanionServer] Handshake timeout for ${remoteAddress}. Disconnecting.`)
        ws.close()
      }
    }, 8000)

    ws.on('message', async (data) => {
      const line = data.toString('utf8').trim()
      if (!line) return

      if (!authenticated) {
        // Handshake verification
        try {
          const parsed = JSON.parse(line) as {
            proof?: string
            deviceId?: string
            deviceName?: string
          }
          if (!parsed.proof) {
            ws.close()
            return
          }

          const proofBytes = base64ToBytes(parsed.proof)
          let matchedSecretBytes: Uint8Array | null = null
          let deviceId = parsed.deviceId || `device_${Date.now()}`
          let deviceName = parsed.deviceName || 'Android Companion'

          // Check active ephemeral pairing session
          const activeSession = this.pairingManager.getActiveSession()
          if (activeSession) {
            const matches = await verifyProof(
              proofBytes,
              activeSession.secretBytes,
              challengeBytes
            )
            if (matches) {
              matchedSecretBytes = activeSession.secretBytes
              this.pairingManager.consumeActiveSession()
              this.pairingManager.savePairedDevice({
                id: deviceId,
                name: deviceName,
                fingerprint: activeSession.fingerprint,
                secretBase64: activeSession.secretBase64,
                pairedAt: Date.now(),
                revoked: false
              })
            }
          }

          // Check existing remembered paired devices
          if (!matchedSecretBytes && parsed.deviceId) {
            const existing = this.pairingManager.findSecretForDevice(parsed.deviceId)
            if (existing) {
              const matches = await verifyProof(
                proofBytes,
                existing.secretBytes,
                challengeBytes
              )
              if (matches) {
                matchedSecretBytes = existing.secretBytes
                deviceId = existing.device.id
                deviceName = existing.device.name
              }
            }
          }

          if (!matchedSecretBytes) {
            console.warn(`[CompanionServer] Authentication proof verification failed from ${remoteAddress}`)
            ws.close()
            return
          }

          // Mutual auth succeeded! Derive directional session keys
          const keys = await deriveSessionKeys(matchedSecretBytes, challengeBytes, true)
          authenticated = true
          clearTimeout(authTimeout)

          companion = {
            id: deviceId,
            name: deviceName,
            remoteAddress,
            sendKey: keys.sendKey,
            receiveKey: keys.receiveKey,
            sentSeq: 0,
            receivedSeq: 0,
            lastActive: Date.now(),
            sendRaw: (msg: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg)
              }
            },
            close: () => ws.close()
          }
          this.clients.set(ws, companion)
          this.callbacks.onClientCountChanged(
            this.getConnectedClientsCount(),
            this.getConnectedClientNames()
          )

          // Send confirmation packet to client
          await this.sendPacket(companion, {
            type: 'heartbeat',
            timestamp: Date.now(),
            uptime: process.uptime()
          })
        } catch (err) {
          console.error('[CompanionServer] Handshake processing error:', err)
          ws.close()
          return
        }
      } else if (companion) {
        companion.lastActive = Date.now()
        try {
          const expectedSeq = companion.receivedSeq
          companion.receivedSeq += 1
          const packet = await openPacket(line, expectedSeq, companion.receiveKey)
          this.handleIncomingPacket(companion, packet)
        } catch (err) {
          console.error(`[CompanionServer] Replay or decryption failure from ${remoteAddress}:`, err)
          ws.close()
          return
        }
      }
    })

    ws.on('close', () => {
      clearTimeout(authTimeout)
      if (this.clients.has(ws)) {
        this.clients.delete(ws)
        this.callbacks.onClientCountChanged(
          this.getConnectedClientsCount(),
          this.getConnectedClientNames()
        )
      }
    })

    ws.on('error', (err) => {
      console.warn(`[CompanionServer] WebSocket error from ${remoteAddress}:`, err.message)
      ws.close()
    })
  }

  private handleIncomingPacket(companion: ConnectedCompanion, packet: WirePacket): void {
    switch (packet.type) {
      case 'stop':
        console.log(`[CompanionServer] Emergency STOP commanded by ${companion.name}: ${packet.reason}`)
        this.callbacks.onStopRequested(packet.reason)
        break

      case 'task_start':
        console.log(`[CompanionServer] Task start dispatched by ${companion.name}: "${packet.task}"`)
        this.callbacks.onTaskStartRequested(packet.task, packet.durationMinutes, packet.mode)
        break

      case 'auth':
        companion.name = packet.deviceName
        companion.id = packet.deviceId
        this.callbacks.onClientCountChanged(
          this.getConnectedClientsCount(),
          this.getConnectedClientNames()
        )
        break

      case 'heartbeat':
        this.sendPacket(companion, {
          type: 'heartbeat',
          timestamp: Date.now(),
          uptime: process.uptime()
        }).catch(() => {})
        break

      default:
        break
    }
  }

  async sendPacket(companion: ConnectedCompanion, packet: WirePacket): Promise<void> {
    const seq = companion.sentSeq
    companion.sentSeq += 1
    const sealedBase64 = await sealPacket(packet, seq, companion.sendKey)
    companion.sendRaw(sealedBase64)
  }

  broadcast(packet: WirePacket): void {
    for (const companion of this.clients.values()) {
      this.sendPacket(companion, packet).catch((err) => {
        console.warn(`[CompanionServer] Broadcast error to ${companion.name}:`, err)
      })
    }
  }

  disconnectDevice(deviceId: string): void {
    for (const [ws, companion] of this.clients) {
      if (companion.id === deviceId) {
        companion.close()
        this.clients.delete(ws)
      }
    }
    this.callbacks.onClientCountChanged(
      this.getConnectedClientsCount(),
      this.getConnectedClientNames()
    )
  }
}
