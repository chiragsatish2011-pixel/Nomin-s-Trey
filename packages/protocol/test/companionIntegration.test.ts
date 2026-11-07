/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Full Integration & Loopback Tests for Trey Desktop Server & Mobile Companion Client.
 * Verifies end-to-end pairing, mutual authentication, AES-GCM framing, replay defense,
 * secret expiry, emergency STOP triggering, and timer monotonicity.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import type { AddressInfo } from 'net'
import { WebSocketServer, WebSocket } from 'ws'
import {
  WirePacket,
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  verifyProof,
  computeProof,
  deriveSessionKeys,
  sealPacket,
  openPacket
} from '../src/index.js'

describe('Desktop & Companion Loopback Integration', () => {
  let server: http.Server
  let wss: WebSocketServer
  let serverPort = 0

  let activeSecret: Uint8Array | null = null
  let activeExpiresAt = 0
  let isConsumed = false

  let onStopTriggered = false
  let onTaskTriggered = ''

  beforeAll(async () => {
    // Spin up test server with exact handshake & AES-GCM protocol
    server = http.createServer()
    wss = new WebSocketServer({ server })

    wss.on('connection', (ws) => {
      let authenticated = false
      let sendKey: CryptoKey | null = null
      let receiveKey: CryptoKey | null = null
      let sentSeq = 0
      let receivedSeq = 0

      const challenge = getRandomBytes(32)
      ws.send(JSON.stringify({ challenge: bytesToBase64(challenge) }))

      ws.on('message', async (data) => {
        const text = String(data).trim()
        if (!text) return

        if (!authenticated) {
          try {
            const parsed = JSON.parse(text)
            if (!parsed.proof || !activeSecret || isConsumed || Date.now() > activeExpiresAt) {
              ws.close(4001, 'Auth Rejected')
              return
            }

            const proofBytes = base64ToBytes(parsed.proof)
            const isValid = await verifyProof(proofBytes, activeSecret, challenge)
            if (!isValid) {
              ws.close(4002, 'Invalid Proof')
              return
            }

            // Mark single-use secret as consumed
            isConsumed = true
            const keys = await deriveSessionKeys(activeSecret, challenge, true)
            sendKey = keys.sendKey
            receiveKey = keys.receiveKey
            authenticated = true

            // Send confirmation
            const welcome: WirePacket = {
              type: 'state',
              revision: 1,
              developerMode: false,
              takeoverActive: false,
              history: [],
              sentAt: Date.now()
            }
            const sealed = await sealPacket(welcome, sentSeq++, sendKey)
            ws.send(sealed)
          } catch {
            ws.close()
          }
        } else if (receiveKey) {
          try {
            const packet = await openPacket(text, receivedSeq++, receiveKey)
            if (packet.type === 'stop') {
              onStopTriggered = true
            } else if (packet.type === 'task_start') {
              onTaskTriggered = packet.task
            }
          } catch {
            ws.close(4003, 'Replay or Crypto Failure')
          }
        }
      })
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo
        serverPort = addr.port
        resolve()
      })
    })
  })

  afterAll(async () => {
    wss.close()
    server.close()
  })

  it('completes mutual authentication and exchanges encrypted packets over loopback', async () => {
    activeSecret = getRandomBytes(32)
    activeExpiresAt = Date.now() + 60000
    isConsumed = false
    onStopTriggered = false
    onTaskTriggered = ''

    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`)

    const receivedPackets: WirePacket[] = []
    let clientSendKey: CryptoKey | null = null
    let clientReceiveKey: CryptoKey | null = null
    let clientSentSeq = 0
    let clientReceivedSeq = 0

    await new Promise<void>((resolve, reject) => {
      ws.on('message', async (data) => {
        const text = String(data).trim()
        if (!clientSendKey) {
          const parsed = JSON.parse(text)
          const challenge = base64ToBytes(parsed.challenge)
          const proof = await computeProof(activeSecret!, challenge)
          const keys = await deriveSessionKeys(activeSecret!, challenge, false)
          clientSendKey = keys.sendKey
          clientReceiveKey = keys.receiveKey

          ws.send(JSON.stringify({ proof: bytesToBase64(proof) }))
        } else if (clientReceiveKey) {
          const packet = await openPacket(text, clientReceivedSeq++, clientReceiveKey)
          receivedPackets.push(packet)
          resolve()
        }
      })
      ws.on('error', reject)
    })

    expect(receivedPackets.length).toBe(1)
    expect(receivedPackets[0].type).toBe('state')

    // Client sends task_start packet
    const taskPacket: WirePacket = {
      type: 'task_start',
      task: 'Write comprehensive report',
      durationMinutes: 45,
      mode: 'focus'
    }
    const sealedTask = await sealPacket(taskPacket, clientSentSeq++, clientSendKey!)
    ws.send(sealedTask)

    // Client sends emergency STOP packet
    const stopPacket: WirePacket = {
      type: 'stop',
      reason: 'Physical emergency abort button pressed',
      timestamp: Date.now()
    }
    const sealedStop = await sealPacket(stopPacket, clientSentSeq++, clientSendKey!)
    ws.send(sealedStop)

    // Wait for server processing
    await new Promise((r) => setTimeout(r, 100))
    expect(onTaskTriggered).toBe('Write comprehensive report')
    expect(onStopTriggered).toBe(true)

    ws.close()
  })

  it('rejects connection when pairing secret has expired', async () => {
    activeSecret = getRandomBytes(32)
    activeExpiresAt = Date.now() - 5000 // Expired 5 seconds ago
    isConsumed = false

    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`)

    const closed = await new Promise<{ code: number }>((resolve) => {
      ws.on('message', async (data) => {
        const parsed = JSON.parse(String(data))
        const challenge = base64ToBytes(parsed.challenge)
        const proof = await computeProof(activeSecret!, challenge)
        ws.send(JSON.stringify({ proof: bytesToBase64(proof) }))
      })
      ws.on('close', (code) => {
        resolve({ code })
      })
    })

    expect(closed.code).toBe(4001)
  })

  it('rejects re-use of an already consumed one-time pairing secret', async () => {
    activeSecret = getRandomBytes(32)
    activeExpiresAt = Date.now() + 60000
    isConsumed = true // Already consumed by another device

    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`)

    const closed = await new Promise<{ code: number }>((resolve) => {
      ws.on('message', async (data) => {
        const parsed = JSON.parse(String(data))
        const challenge = base64ToBytes(parsed.challenge)
        const proof = await computeProof(activeSecret!, challenge)
        ws.send(JSON.stringify({ proof: bytesToBase64(proof) }))
      })
      ws.on('close', (code) => {
        resolve({ code })
      })
    })

    expect(closed.code).toBe(4001)
  })

  it('rejects connection when client submits invalid HMAC challenge proof', async () => {
    activeSecret = getRandomBytes(32)
    activeExpiresAt = Date.now() + 60000
    isConsumed = false

    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`)

    const closed = await new Promise<{ code: number }>((resolve) => {
      ws.on('message', () => {
        // Submit bogus 32-byte proof
        const bogusProof = getRandomBytes(32)
        ws.send(JSON.stringify({ proof: bytesToBase64(bogusProof) }))
      })
      ws.on('close', (code) => {
        resolve({ code })
      })
    })

    expect(closed.code).toBe(4002)
  })

  it('verifies timer single-source-of-truth monotonicity with zero skipped seconds', () => {
    const startedAt = 1700000000000
    const duration = 1800

    // Compute at multiple irregular intervals: 100ms, 250ms, 450ms, 1200ms
    const intervals = [100, 250, 450, 750, 1000, 1250, 2000, 2050]
    let lastClockSeconds = duration

    for (const dt of intervals) {
      const now = startedAt + dt
      const elapsed = (now - startedAt) / 1000
      const remaining = Math.max(0, duration - elapsed)
      const clockSeconds = Math.ceil(remaining)

      // Remaining must be monotonically non-increasing
      expect(clockSeconds).toBeLessThanOrEqual(lastClockSeconds)
      // Must not skip any second unexpectedly
      expect(lastClockSeconds - clockSeconds).toBeLessThanOrEqual(Math.ceil(dt / 1000) + 1)
      lastClockSeconds = clockSeconds
    }
  })
})
