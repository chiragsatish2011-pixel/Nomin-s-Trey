import { NotImplementedError } from './Capabilities.js'

export interface PushToTalkListener {
  onKeyDown: () => void
  onKeyUp: () => void
}

export interface PushToTalk {
  start(listener: PushToTalkListener): Promise<void>
  stop(): Promise<void>
}

export class LinuxPushToTalkStub implements PushToTalk {
  async start(listener: PushToTalkListener): Promise<void> {
    void listener
    throw new NotImplementedError('PushToTalk', 'linux')
  }
  async stop(): Promise<void> {
    throw new NotImplementedError('PushToTalk', 'linux')
  }
}

export class AndroidPushToTalkStub implements PushToTalk {
  async start(listener: PushToTalkListener): Promise<void> {
    void listener
    throw new NotImplementedError('PushToTalk', 'android')
  }
  async stop(): Promise<void> {
    throw new NotImplementedError('PushToTalk', 'android')
  }
}
