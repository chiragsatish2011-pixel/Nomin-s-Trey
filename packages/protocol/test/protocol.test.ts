/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Unit tests for @nomin/protocol: QR serialization, mutual authentication,
 * HKDF key derivation, AES-256-GCM framing, and replay protection.
 */

import { describe, it, expect } from 'vitest'
import {
  PROTOCOL_VERSION,
  PairingRecord,
  formatQrText,
  parseQrText,
  WirePacket,
  computeIdentifier,
  computeProof,
  verifyProof,
  deriveSessionKeys,
  sealPacket,
  openPacket,
  getRandomBytes,
  bytesToBase64
} from '../src/index.js'

describe('Pairing QR Code Serialization & Expiration', () => {
  it('formats and parses valid pairing record correctly', () => {
    const secret = bytesToBase64(getRandomBytes(32))
    const record: PairingRecord = {
      version: PROTOCOL_VERSION,
      service: 'Trey-PC.local',
      secret,
      port: 59124,
      addresses: ['192.168.1.100', '100.64.0.1'],
      expiresAt: Date.now() + 300000 // 5 minutes
    }

    const qrText = formatQrText(record)
    expect(qrText.startsWith('trey-pair:')).toBe(true)

    const parsed = parseQrText(qrText)
    expect(parsed).not.toBeNull()
    expect(parsed?.version).toBe(PROTOCOL_VERSION)
    expect(parsed?.service).toBe('Trey-PC.local')
    expect(parsed?.secret).toBe(secret)
    expect(parsed?.port).toBe(59124)
    expect(parsed?.addresses).toEqual(['192.168.1.100', '100.64.0.1'])
  })

  it('rejects expired pairing record', () => {
    const record: PairingRecord = {
      version: PROTOCOL_VERSION,
      service: 'Trey-PC.local',
      secret: bytesToBase64(getRandomBytes(32)),
      port: 59124,
      addresses: ['192.168.1.100'],
      expiresAt: Date.now() - 1000 // Expired 1 second ago
    }

    const qrText = formatQrText(record)
    const parsed = parseQrText(qrText)
    expect(parsed).toBeNull()
  })

  it('rejects invalid or corrupted QR text', () => {
    expect(parseQrText('invalid-prefix:abc')).toBeNull()
    expect(parseQrText('trey-pair:not-base64-json')).toBeNull()
    expect(parseQrText('')).toBeNull()
  })
})

describe('Cryptographic Fingerprint & Mutual Authentication Proof', () => {
  it('computes 24-character hex identifier from secret bytes', async () => {
    const secret = getRandomBytes(32)
    const identifier = await computeIdentifier(secret)
    expect(identifier.length).toBe(24)
    expect(/^[0-9a-f]{24}$/.test(identifier)).toBe(true)

    // Deterministic
    const id2 = await computeIdentifier(secret)
    expect(id2).toBe(identifier)
  })

  it('proves and verifies mutual challenge successfully', async () => {
    const secret = getRandomBytes(32)
    const challenge = getRandomBytes(32)

    const proof = await computeProof(secret, challenge)
    expect(proof.length).toBe(32)

    const isValid = await verifyProof(proof, secret, challenge)
    expect(isValid).toBe(true)
  })

  it('rejects forged challenge proof or wrong secret', async () => {
    const secret = getRandomBytes(32)
    const wrongSecret = getRandomBytes(32)
    const challenge = getRandomBytes(32)

    const proof = await computeProof(secret, challenge)

    // Wrong secret must fail
    const validWrongSecret = await verifyProof(proof, wrongSecret, challenge)
    expect(validWrongSecret).toBe(false)

    // Tampered challenge must fail
    const tamperedChallenge = new Uint8Array(challenge)
    tamperedChallenge[0] ^= 0xff
    const validTamperedChallenge = await verifyProof(proof, secret, tamperedChallenge)
    expect(validTamperedChallenge).toBe(false)

    // Corrupted proof must fail
    const corruptedProof = new Uint8Array(proof)
    corruptedProof[0] ^= 0xff
    const validCorruptedProof = await verifyProof(corruptedProof, secret, challenge)
    expect(validCorruptedProof).toBe(false)
  })
})

describe('AES-256-GCM Framing & Monotonic Sequence Replay Protection', () => {
  it('encrypts, transmits, and decrypts packets in order across server and client', async () => {
    const secret = getRandomBytes(32)
    const challenge = getRandomBytes(32)

    const serverKeys = await deriveSessionKeys(secret, challenge, true)
    const clientKeys = await deriveSessionKeys(secret, challenge, false)

    // 1. Desktop sends state packet (seq 0) to mobile
    const statePacket: WirePacket = {
      type: 'state',
      revision: 1,
      developerMode: false,
      takeoverActive: false,
      history: [],
      sentAt: Date.now()
    }

    const envelope0 = await sealPacket(statePacket, 0, serverKeys.sendKey)
    const receivedPacket0 = await openPacket(envelope0, 0, clientKeys.receiveKey)
    expect(receivedPacket0.type).toBe('state')
    if (receivedPacket0.type === 'state') {
      expect(receivedPacket0.revision).toBe(1)
    }

    // 2. Mobile sends emergency stop packet (seq 0) to desktop
    const stopPacket: WirePacket = {
      type: 'stop',
      reason: 'Physical emergency halt',
      timestamp: Date.now()
    }

    const envelopeStop = await sealPacket(stopPacket, 0, clientKeys.sendKey)
    const receivedStop = await openPacket(envelopeStop, 0, serverKeys.receiveKey)
    expect(receivedStop.type).toBe('stop')
    if (receivedStop.type === 'stop') {
      expect(receivedStop.reason).toBe('Physical emergency halt')
    }
  })

  it('rejects replayed or out-of-order sequence frames', async () => {
    const secret = getRandomBytes(32)
    const challenge = getRandomBytes(32)

    const serverKeys = await deriveSessionKeys(secret, challenge, true)
    const clientKeys = await deriveSessionKeys(secret, challenge, false)

    const packet: WirePacket = {
      type: 'heartbeat',
      timestamp: Date.now(),
      uptime: 42
    }

    // Sealed with sequence 0
    const envelopeSeq0 = await sealPacket(packet, 0, serverKeys.sendKey)

    // Recipient successfully receives sequence 0
    await openPacket(envelopeSeq0, 0, clientKeys.receiveKey)

    // Attacker attempts to replay sequence 0 when recipient expects sequence 1
    await expect(openPacket(envelopeSeq0, 1, clientKeys.receiveKey)).rejects.toThrow(
      /Replay or sequence mismatch/
    )
  })

  it('rejects tampered or corrupt ciphertext envelopes', async () => {
    const secret = getRandomBytes(32)
    const challenge = getRandomBytes(32)

    const serverKeys = await deriveSessionKeys(secret, challenge, true)
    const clientKeys = await deriveSessionKeys(secret, challenge, false)

    const packet: WirePacket = {
      type: 'face',
      gazeX: 0.5,
      gazeY: -0.2,
      mood: 'happy',
      talk: 0.8
    }

    const validEnvelope = await sealPacket(packet, 0, serverKeys.sendKey)

    // Corrupt the base64 payload
    const corruptedEnvelope =
      validEnvelope.slice(0, 10) + (validEnvelope[10] === 'A' ? 'B' : 'A') + validEnvelope.slice(11)

    await expect(openPacket(corruptedEnvelope, 0, clientKeys.receiveKey)).rejects.toThrow()
  })
})
