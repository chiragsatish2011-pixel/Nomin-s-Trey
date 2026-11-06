import { NotImplementedError } from './Capabilities.js'

export interface SecretStore {
  getSecret(key: string): Promise<string | null>
  setSecret(key: string, value: string): Promise<void>
  deleteSecret(key: string): Promise<void>
}

export class LinuxSecretStoreStub implements SecretStore {
  async getSecret(key: string): Promise<string | null> {
    void key
    throw new NotImplementedError('SecretStore', 'linux')
  }
  async setSecret(key: string, value: string): Promise<void> {
    void key
    void value
    throw new NotImplementedError('SecretStore', 'linux')
  }
  async deleteSecret(key: string): Promise<void> {
    void key
    throw new NotImplementedError('SecretStore', 'linux')
  }
}

export class AndroidSecretStoreStub implements SecretStore {
  async getSecret(key: string): Promise<string | null> {
    void key
    throw new NotImplementedError('SecretStore', 'android')
  }
  async setSecret(key: string, value: string): Promise<void> {
    void key
    void value
    throw new NotImplementedError('SecretStore', 'android')
  }
  async deleteSecret(key: string): Promise<void> {
    void key
    throw new NotImplementedError('SecretStore', 'android')
  }
}
