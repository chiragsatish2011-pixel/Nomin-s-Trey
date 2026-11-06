import { VisionProvider, ClassificationInput, NudgeInput, NudgeOutput } from './VisionProvider.js'
import { NimClient } from './NimClient.js'
import { NimGovernor } from './NimGovernor.js'
import { Classifier } from './Classifier.js'
import { NudgeWriter } from './NudgeWriter.js'
import { Researcher, ResearchReport } from './Researcher.js'
import { CheckResult } from '../policy/NudgePolicy.js'

export class NimVisionProvider implements VisionProvider {
  readonly client: NimClient
  readonly governor: NimGovernor
  readonly classifier: Classifier
  readonly nudgeWriter: NudgeWriter
  readonly researcher: Researcher

  constructor(apiKey: string, options?: { rpmLimit?: number; baseUrl?: string; fallbackModels?: string[] }) {
    this.governor = new NimGovernor(options?.rpmLimit ?? 30)
    this.client = new NimClient(apiKey, {
      baseUrl: options?.baseUrl,
      fallbackModels: options?.fallbackModels
    })
    this.classifier = new Classifier(this.client, this.governor)
    this.nudgeWriter = new NudgeWriter(this.client, this.governor)
    this.researcher = new Researcher(this.client, this.governor)
  }

  setApiKey(key: string): void {
    this.client.setApiKey(key)
  }

  setBaseUrl(url: string): void {
    this.client.setBaseUrl(url)
  }

  getBaseUrl(): string {
    return this.client.getBaseUrl()
  }

  setModel(model: string, fallbackModels?: string[]): void {
    this.client.setModel(model, fallbackModels)
  }

  setRpmLimit(rpm: number): void {
    this.governor.setRpmLimit(rpm)
  }

  async classify(input: ClassificationInput): Promise<CheckResult> {
    return this.classifier.classify(input)
  }

  async generateNudge(input: NudgeInput): Promise<NudgeOutput> {
    return this.nudgeWriter.generateNudge(input)
  }

  async research(question: string, context?: string, jpegBase64?: string): Promise<ResearchReport> {
    return this.researcher.research(question, context, jpegBase64)
  }

  async listVisionModels(): Promise<string[]> {
    return this.governor.schedule('model_refresh', async () => {
      return this.client.listVisionModels()
    })
  }

  getMaskedKey(): string | null {
    return this.client.getMaskedKey()
  }

  async testConnection(candidateKey?: string): Promise<{
    success: boolean
    modelCount?: number
    latencyMs: number
    error?: string
  }> {
    return this.client.testConnection(candidateKey)
  }
}
