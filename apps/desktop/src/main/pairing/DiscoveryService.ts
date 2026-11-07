/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Lightweight local network discovery advertiser for Trey Desktop.
 * Advertises Trey Companion presence on local subnet via UDP multicast beacon.
 */

import dgram from 'dgram'
import os from 'os'

export interface DiscoveryOptions {
  port: number
  fingerprint: string
}

export class DiscoveryService {
  private socket: dgram.Socket | null = null
  private beaconInterval: NodeJS.Timeout | null = null
  private options: DiscoveryOptions | null = null
  private readonly MULTICAST_ADDR = '239.255.255.250'
  private readonly DISCOVERY_PORT = 59125

  start(options: DiscoveryOptions): void {
    this.options = options
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('error', (err) => {
        console.warn('[DiscoveryService] UDP error:', err.message)
      })

      this.socket.bind(() => {
        try {
          this.socket?.setBroadcast(true)
          this.socket?.setMulticastTTL(2)
        } catch {
          // Some network interfaces may restrict multicast TTL
        }

        // Broadcast beacon every 3 seconds
        this.beaconInterval = setInterval(() => {
          this.sendBeacon()
        }, 3000)

        // Send first beacon immediately
        this.sendBeacon()
      })
    } catch (err) {
      console.warn('[DiscoveryService] Could not initialize UDP socket:', err)
    }
  }

  updateFingerprint(fingerprint: string): void {
    if (this.options) {
      this.options.fingerprint = fingerprint
      this.sendBeacon()
    }
  }

  private sendBeacon(): void {
    if (!this.socket || !this.options) return

    const payload = JSON.stringify({
      service: '_trey._tcp',
      name: os.hostname() || 'Trey-PC',
      port: this.options.port,
      fingerprint: this.options.fingerprint,
      v: 1,
      timestamp: Date.now()
    })

    const message = Buffer.from(payload, 'utf8')

    // Broadcast to local subnet broadcast 255.255.255.255 and multicast group
    try {
      this.socket.send(message, 0, message.length, this.DISCOVERY_PORT, '255.255.255.255')
      this.socket.send(message, 0, message.length, this.DISCOVERY_PORT, this.MULTICAST_ADDR)
    } catch {
      // Ignore transient broadcast socket errors on network changes
    }
  }

  stop(): void {
    if (this.beaconInterval) {
      clearInterval(this.beaconInterval)
      this.beaconInterval = null
    }
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        // ignore
      }
      this.socket = null
    }
  }
}
