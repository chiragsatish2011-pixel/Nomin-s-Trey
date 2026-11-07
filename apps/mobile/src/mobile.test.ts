/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Unit tests for Trey Mobile App services: StorageService, mode switching, and theme persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StorageService } from './services/StorageService'
import { PairingRecord } from '@nomin/protocol'

describe('Mobile StorageService', () => {
  beforeEach(() => {
    StorageService.clearAll()
  })

  it('stores and retrieves active mode with companion as default', () => {
    expect(StorageService.getActiveMode()).toBe('companion')

    StorageService.setActiveMode('standalone')
    expect(StorageService.getActiveMode()).toBe('standalone')

    StorageService.setActiveMode('companion')
    expect(StorageService.getActiveMode()).toBe('companion')
  })

  it('persists and clears pairing records', () => {
    expect(StorageService.getPairingRecord()).toBeNull()

    const mockRecord: PairingRecord = {
      version: 1,
      service: 'MacBook-Pro.local',
      secret: 'c2VjcmV0LWtleS0zMi1ieXRlcw==',
      port: 59124,
      addresses: ['192.168.1.50'],
      expiresAt: Date.now() + 300000
    }

    StorageService.setPairingRecord(mockRecord)
    const retrieved = StorageService.getPairingRecord()
    expect(retrieved).not.toBeNull()
    expect(retrieved?.service).toBe('MacBook-Pro.local')
    expect(retrieved?.port).toBe(59124)

    StorageService.setPairingRecord(null)
    expect(StorageService.getPairingRecord()).toBeNull()
  })

  it('stores and retrieves standalone NIM API key and model', () => {
    expect(StorageService.getNimApiKey()).toBe('')

    StorageService.setNimApiKey('  nvapi-test-key-1234  ')
    expect(StorageService.getNimApiKey()).toBe('nvapi-test-key-1234')

    StorageService.setNimModel('nvidia/nemotron-4-340b-instruct')
    expect(StorageService.getNimModel()).toBe('nvidia/nemotron-4-340b-instruct')
  })

  it('persists theme preference', () => {
    expect(StorageService.getTheme()).toBe('dark')

    StorageService.setTheme('light')
    expect(StorageService.getTheme()).toBe('light')

    StorageService.setTheme('dark')
    expect(StorageService.getTheme()).toBe('dark')
  })
})
