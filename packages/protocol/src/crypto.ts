/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * WebCrypto-based cross-platform cryptographic implementation of Bluey-inspired
 * mutual authentication, HKDF key derivation, and AES-256-GCM ordered framing.
 * Works uniformly in Node.js (v18+) and modern browsers / mobile WebViews.
 */

import {
  WireEnvelope,
  WireEnvelopeSchema,
  WirePacket,
  WirePacketSchema
} from './schemas.js'

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle
  }
  throw new Error('WebCrypto API (crypto.subtle) is not available in this runtime.')
}

export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
  throw new Error('crypto.getRandomValues is not available in this runtime.')
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64')
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Computes public 24-character hexadecimal fingerprint from secret bytes (first 12 bytes of SHA-256).
 */
export async function computeIdentifier(secretBytes: Uint8Array): Promise<string> {
  const subtle = getSubtleCrypto()
  const digest = await subtle.digest('SHA-256', secretBytes as unknown as BufferSource)
  const prefix = new Uint8Array(digest).slice(0, 12)
  return bytesToHex(prefix)
}

/**
 * Computes proof HMAC-SHA256("trey-pair-v1" + challenge, key = secret).
 */
export async function computeProof(
  secretBytes: Uint8Array,
  challengeBytes: Uint8Array
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto()
  const key = await subtle.importKey(
    'raw',
    secretBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const prefix = new TextEncoder().encode('trey-pair-v1')
  const payload = new Uint8Array(prefix.length + challengeBytes.length)
  payload.set(prefix, 0)
  payload.set(challengeBytes, prefix.length)

  const signature = await subtle.sign('HMAC', key, payload as unknown as BufferSource)
  return new Uint8Array(signature)
}

/**
 * Constant-time verification of challenge proof.
 */
export async function verifyProof(
  proofBytes: Uint8Array,
  secretBytes: Uint8Array,
  challengeBytes: Uint8Array
): Promise<boolean> {
  const subtle = getSubtleCrypto()
  const key = await subtle.importKey(
    'raw',
    secretBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const prefix = new TextEncoder().encode('trey-pair-v1')
  const payload = new Uint8Array(prefix.length + challengeBytes.length)
  payload.set(prefix, 0)
  payload.set(challengeBytes, prefix.length)

  return await subtle.verify(
    'HMAC',
    key,
    proofBytes as unknown as BufferSource,
    payload as unknown as BufferSource
  )
}

/**
 * Derives directional 256-bit AES-GCM session keys via HKDF-SHA256.
 */
export async function deriveSessionKeys(
  secretBytes: Uint8Array,
  challengeBytes: Uint8Array,
  isServer: boolean
): Promise<{ sendKey: CryptoKey; receiveKey: CryptoKey }> {
  const subtle = getSubtleCrypto()
  const ikm = await subtle.importKey(
    'raw',
    secretBytes as unknown as BufferSource,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )

  const desktopToPhoneInfo = new TextEncoder().encode('trey-v1-desktop-to-phone')
  const phoneToDesktopInfo = new TextEncoder().encode('trey-v1-phone-to-desktop')

  const desktopToPhoneKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: challengeBytes as unknown as BufferSource,
      info: desktopToPhoneInfo as unknown as BufferSource
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  const phoneToDesktopKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: challengeBytes as unknown as BufferSource,
      info: phoneToDesktopInfo as unknown as BufferSource
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return {
    sendKey: isServer ? desktopToPhoneKey : phoneToDesktopKey,
    receiveKey: isServer ? phoneToDesktopKey : desktopToPhoneKey
  }
}

/**
 * Encrypts and frames a packet into an AES-256-GCM envelope with an ordered sequence counter.
 * Output: Base64 string containing: 12-byte IV + Ciphertext + 16-byte Auth Tag.
 */
export async function sealPacket(
  packet: WirePacket,
  sequence: number,
  sendKey: CryptoKey
): Promise<string> {
  const subtle = getSubtleCrypto()
  // Validate packet against schema
  WirePacketSchema.parse(packet)

  const envelope: WireEnvelope = {
    sequence,
    packet
  }
  const jsonStr = JSON.stringify(envelope)
  const plainBytes = new TextEncoder().encode(jsonStr)

  const iv = getRandomBytes(12)
  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    sendKey,
    plainBytes as unknown as BufferSource
  )
  const ciphertextBytes = new Uint8Array(ciphertextBuffer)

  // Combined: IV (12 bytes) + Ciphertext + Auth Tag
  const combined = new Uint8Array(iv.length + ciphertextBytes.length)
  combined.set(iv, 0)
  combined.set(ciphertextBytes, iv.length)

  return bytesToBase64(combined)
}

/**
 * Decrypts and verifies an AES-256-GCM envelope, strictly verifying the expected monotonic sequence counter.
 * Throws an Error if the sequence is incorrect (preventing replay attacks or dropped packet desyncs).
 */
export async function openPacket(
  base64Envelope: string,
  expectedSequence: number,
  receiveKey: CryptoKey
): Promise<WirePacket> {
  const subtle = getSubtleCrypto()
  const combined = base64ToBytes(base64Envelope)
  if (combined.length < 12 + 16) {
    throw new Error('Ciphertext envelope is truncated or invalid.')
  }

  const iv = combined.slice(0, 12)
  const ciphertextWithTag = combined.slice(12)

  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    receiveKey,
    ciphertextWithTag as unknown as BufferSource
  )
  const decryptedJson = new TextDecoder().decode(decryptedBuffer)
  const parsed = JSON.parse(decryptedJson)
  const envelope = WireEnvelopeSchema.parse(parsed)

  if (envelope.sequence !== expectedSequence) {
    throw new Error(
      `Replay or sequence mismatch: expected sequence ${expectedSequence}, got ${envelope.sequence}`
    )
  }

  return envelope.packet
}
