import { safeStorage, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import type { SecretStore } from '@bluey/core'

export class WindowsSecretStore implements SecretStore {
  private getCandidatePaths(): string[] {
    const paths: string[] = []
    try {
      paths.push(join(app.getPath('userData'), 'secrets.enc'))
    } catch {
      // app not ready
    }

    try {
      const appData = app.getPath('appData')
      paths.push(join(appData, '@bluey', 'desktop', 'secrets.enc'))
      paths.push(join(appData, 'Trey', 'secrets.enc'))
      paths.push(join(appData, 'bluey-by-riley', 'secrets.enc'))
    } catch {
      // fallback
    }

    return paths
  }

  private getBackupKeyPaths(): string[] {
    const paths: string[] = []
    try {
      paths.push(join(app.getPath('userData'), 'nim_key.txt'))
    } catch {
      // ignore
    }
    try {
      const appData = app.getPath('appData')
      paths.push(join(appData, '@bluey', 'desktop', 'nim_key.txt'))
      paths.push(join(appData, 'Trey', 'nim_key.txt'))
    } catch {
      // ignore
    }
    return paths
  }

  private readAll(): Record<string, string> {
    const candidates = this.getCandidatePaths()

    for (const p of candidates) {
      if (existsSync(p)) {
        try {
          const raw = readFileSync(p)
          if (safeStorage.isEncryptionAvailable()) {
            try {
              const decrypted = safeStorage.decryptString(raw)
              const parsed = JSON.parse(decrypted)
              if (parsed && typeof parsed === 'object') {
                return parsed
              }
            } catch {
              // Might have been unencrypted
            }
          }

          const plain = raw.toString('utf8')
          if (plain.startsWith('{')) {
            const parsed = JSON.parse(plain)
            if (parsed && typeof parsed === 'object') {
              return parsed
            }
          }
        } catch {
          // Try next candidate
        }
      }
    }

    // Check backup plain key files
    for (const bp of this.getBackupKeyPaths()) {
      if (existsSync(bp)) {
        try {
          const keyContent = readFileSync(bp, 'utf8').trim()
          if (keyContent.length > 0) {
            return { nim_api_key: keyContent }
          }
        } catch {
          // ignore
        }
      }
    }

    return {}
  }

  private writeAll(secrets: Record<string, string>): void {
    const jsonStr = JSON.stringify(secrets)
    const candidates = this.getCandidatePaths()

    for (const p of candidates) {
      try {
        const dir = join(p, '..')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(jsonStr)
          writeFileSync(p, encrypted)
        } else {
          writeFileSync(p, Buffer.from(jsonStr, 'utf8'))
        }
      } catch (err) {
        console.warn(`Could not write secret to ${p}:`, err)
      }
    }

    // Write backup plaintext key file for rock-solid survival across app migrations
    if (secrets.nim_api_key) {
      for (const bp of this.getBackupKeyPaths()) {
        try {
          const bdir = join(bp, '..')
          if (!existsSync(bdir)) {
            mkdirSync(bdir, { recursive: true })
          }
          writeFileSync(bp, secrets.nim_api_key.trim(), 'utf8')
        } catch {
          // ignore
        }
      }
    }
  }

  async getSecret(key: string): Promise<string | null> {
    const all = this.readAll()
    const val = all[key]
    return val && typeof val === 'string' && val.trim().length > 0 ? val.trim() : null
  }

  async setSecret(key: string, value: string): Promise<void> {
    const all = this.readAll()
    all[key] = value.trim()
    this.writeAll(all)
  }

  async deleteSecret(key: string): Promise<void> {
    const all = this.readAll()
    delete all[key]
    this.writeAll(all)

    if (key === 'nim_api_key') {
      for (const bp of this.getBackupKeyPaths()) {
        try {
          if (existsSync(bp)) unlinkSync(bp)
        } catch {
          // ignore
        }
      }
    }
  }
}

export const windowsSecretStore = new WindowsSecretStore()
