export type AiProvider = 'nim' | 'openai' | 'openrouter' | 'groq' | 'custom'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
  timeoutMs?: number
}

export interface KeyAuditResult {
  success: boolean
  provider: AiProvider
  baseUrl: string
  visionModel: string
  fallbackVisionModels: string[]
  textModel: string
  audioSupported: boolean
  allModelsCount: number
  latencyMs: number
  error?: string
}

export function detectProvider(
  apiKey: string,
  explicitUrl?: string
): {
  provider: AiProvider
  baseUrl: string
  defaultVisionModels: string[]
  defaultTextModels: string[]
} {
  const trimmedKey = (apiKey || '').trim()
  const trimmedUrl = (explicitUrl || '').trim().replace(/\/+$/, '')

  if (trimmedUrl && !trimmedUrl.includes('integrate.api.nvidia.com')) {
    return {
      provider: 'custom',
      baseUrl: trimmedUrl,
      defaultVisionModels: ['gpt-4o', 'gpt-4o-mini', 'nvidia/nemotron-3.5-super-vl-120b-a12b'],
      defaultTextModels: ['gpt-4o-mini', 'meta/llama-3.3-70b-instruct']
    }
  }

  if (trimmedKey.startsWith('nvapi-')) {
    return {
      provider: 'nim',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      defaultVisionModels: [
        'nvidia/nemotron-3.5-super-vl-120b-a12b',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
        'meta/llama-3.2-90b-vision-instruct'
      ],
      defaultTextModels: ['meta/llama-3.3-70b-instruct', 'nvidia/nemotron-3.5-super-vl-120b-a12b']
    }
  }

  if (trimmedKey.startsWith('sk-or-')) {
    return {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultVisionModels: [
        'openai/gpt-4o-mini',
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.2-11b-vision-instruct'
      ],
      defaultTextModels: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct']
    }
  }

  if (trimmedKey.startsWith('gsk_')) {
    return {
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultVisionModels: ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'],
      defaultTextModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
    }
  }

  if (trimmedKey.startsWith('sk-')) {
    return {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      defaultVisionModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      defaultTextModels: ['gpt-4o-mini', 'gpt-4o']
    }
  }

  // Default fallback to NVIDIA NIM
  return {
    provider: 'nim',
    baseUrl: trimmedUrl || 'https://integrate.api.nvidia.com/v1',
    defaultVisionModels: [
      'nvidia/nemotron-3.5-super-vl-120b-a12b',
      'nvidia/nemotron-3.5-lightning-30b-a3b'
    ],
    defaultTextModels: ['meta/llama-3.3-70b-instruct', 'nvidia/nemotron-3.5-super-vl-120b-a12b']
  }
}

export class NimClient {
  private apiKey: string
  private baseUrl: string
  private provider: AiProvider
  private fallbackModels: string[]
  private textModel: string

  constructor(
    apiKey: string,
    options?: {
      baseUrl?: string
      provider?: AiProvider
      fallbackModels?: string[]
      textModel?: string
    }
  ) {
    this.apiKey = apiKey
    const detected = detectProvider(apiKey, options?.baseUrl)
    this.provider = options?.provider || detected.provider
    this.baseUrl = (options?.baseUrl || detected.baseUrl).replace(/\/+$/, '')
    this.fallbackModels = options?.fallbackModels || detected.defaultVisionModels
    this.textModel = options?.textModel || detected.defaultTextModels[0]
  }

  setApiKey(key: string): void {
    this.apiKey = key
    const detected = detectProvider(key, this.baseUrl)
    this.provider = detected.provider
    if (!this.baseUrl || this.baseUrl === 'https://integrate.api.nvidia.com/v1') {
      this.baseUrl = detected.baseUrl
    }
    if (this.fallbackModels.length === 0) {
      this.fallbackModels = detected.defaultVisionModels
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = (url || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  getProvider(): AiProvider {
    return this.provider
  }

  setModel(model: string, fallbackModels?: string[]): void {
    const preservedFallbacks = fallbackModels ?? this.fallbackModels.filter((item) => item !== model)
    const list = [model, ...preservedFallbacks].filter(Boolean)
    if (list.length > 0) {
      this.fallbackModels = list
    }
  }

  getModels(): string[] {
    return [...this.fallbackModels]
  }

  setTextModel(model: string): void {
    this.textModel = model
  }

  getTextModel(): string {
    return this.textModel
  }

  hasApiKey(): boolean {
    return this.apiKey.trim().length > 0
  }

  getMaskedKey(): string | null {
    const trimmed = this.apiKey.trim()
    if (!trimmed) return null
    if (trimmed.length < 10) return '••••••••'
    const prefix = trimmed.slice(0, 6)
    const suffix = trimmed.slice(-4)
    return `${prefix}••••••••${suffix}`
  }

  /**
   * Universal Capabilities Auditor: Probes any API key, tests its models list,
   * identifies optimal vision and reasoning models, and validates functionality.
   */
  async auditKey(candidateKey?: string, candidateUrl?: string): Promise<KeyAuditResult> {
    const keyToTest = (candidateKey !== undefined ? candidateKey : this.apiKey).trim()
    const detected = detectProvider(keyToTest, candidateUrl || this.baseUrl)
    const baseUrl = (candidateUrl || detected.baseUrl).replace(/\/+$/, '')
    const t0 = Date.now()

    if (!keyToTest) {
      return {
        success: false,
        provider: detected.provider,
        baseUrl,
        visionModel: detected.defaultVisionModels[0],
        fallbackVisionModels: detected.defaultVisionModels.slice(1),
        textModel: detected.defaultTextModels[0],
        audioSupported: false,
        allModelsCount: 0,
        latencyMs: 0,
        error: 'API key is missing or empty.'
      }
    }

    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${keyToTest}`,
          Accept: 'application/json'
        }
      })

      const latencyMs = Date.now() - t0

      if (!res.ok) {
        if (res.status === 401) {
          return {
            success: false,
            provider: detected.provider,
            baseUrl,
            visionModel: detected.defaultVisionModels[0],
            fallbackVisionModels: detected.defaultVisionModels.slice(1),
            textModel: detected.defaultTextModels[0],
            audioSupported: false,
            allModelsCount: 0,
            latencyMs,
            error: `Unauthorized (401): The provided ${detected.provider.toUpperCase()} API key is invalid.`
          }
        }
        if (res.status === 403) {
          return {
            success: false,
            provider: detected.provider,
            baseUrl,
            visionModel: detected.defaultVisionModels[0],
            fallbackVisionModels: detected.defaultVisionModels.slice(1),
            textModel: detected.defaultTextModels[0],
            audioSupported: false,
            allModelsCount: 0,
            latencyMs,
            error: 'Forbidden (403): The API key lacks permission to access models.'
          }
        }
        return {
          success: false,
          provider: detected.provider,
          baseUrl,
          visionModel: detected.defaultVisionModels[0],
          fallbackVisionModels: detected.defaultVisionModels.slice(1),
          textModel: detected.defaultTextModels[0],
          audioSupported: false,
          allModelsCount: 0,
          latencyMs,
          error: `API returned HTTP ${res.status}.`
        }
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const modelList = (data.data || []).map((m) => m.id)

      // Filter vision models (exclude non-chat models: embeddings, retrievers, detectors, reward, and retired models)
      const visionKeywords = /(vision|vl|image|gpt-4o|claude-3-5|gemini-2|pixtral|qwen-vl|nemotron.*vl)/i
      const discoveredVision = modelList.filter((id) => {
        if (
          id.includes('embed') ||
          id.includes('retriever') ||
          id.includes('detector') ||
          id.includes('reward') ||
          id.includes('safety')
        ) {
          return false // Non-conversational or safety/embedding models cannot chat
        }
        if (
          (id.includes('llama-3.2-11b') || id.includes('llama-3.2-90b')) &&
          baseUrl.includes('nvidia.com')
        ) {
          return false // NVIDIA retired 11b EOL and 90b vision stalls indefinitely
        }
        return visionKeywords.test(id)
      })

      // Prioritize known top performers verified for rapid interactive response
      let bestVision = detected.defaultVisionModels[0]
      if (discoveredVision.length > 0) {
        // Look for exact matches in priority order
        const preferred = [
          'gpt-4o',
          'nvidia/nemotron-3.5-super-vl-120b-a12b',
          'nvidia/nemotron-3.5-lightning-30b-a3b',
          'gpt-4o-mini',
          'llama-3.2-11b-vision-preview'
        ]
        const topMatch = preferred.find((p) => discoveredVision.includes(p))
        bestVision = topMatch || discoveredVision[0]
      }

      const fallbacks = discoveredVision.filter((m) => m !== bestVision)
      const effectiveFallbacks = (
        fallbacks.length > 0
          ? fallbacks
          : detected.defaultVisionModels.filter((m) => m !== bestVision)
      ).filter(
        (m) =>
          !m.includes('llama-3.2-90b') &&
          !m.includes('embed') &&
          !m.includes('retriever')
      )

      // Text reasoning model
      const textKeywords = /(instruct|chat|turbo|mini|versatile)/i
      const discoveredText = modelList.filter((id) => textKeywords.test(id))
      let bestText = detected.defaultTextModels[0]
      if (discoveredText.length > 0) {
        const preferredText = [
          'gpt-4o-mini',
          'meta/llama-3.3-70b-instruct',
          'llama-3.3-70b-versatile',
          'gpt-4o',
          'llama-3.1-8b-instant'
        ]
        const topMatch = preferredText.find((p) => discoveredText.includes(p))
        bestText = topMatch || discoveredText[0]
      }

      const audioSupported =
        modelList.some((id) => id.includes('whisper') || id.includes('canary')) ||
        detected.provider === 'openai' ||
        detected.provider === 'groq'

      return {
        success: true,
        provider: detected.provider,
        baseUrl,
        visionModel: bestVision,
        fallbackVisionModels: effectiveFallbacks,
        textModel: bestText,
        audioSupported,
        allModelsCount: modelList.length,
        latencyMs
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - t0
      const msg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        provider: detected.provider,
        baseUrl,
        visionModel: detected.defaultVisionModels[0],
        fallbackVisionModels: detected.defaultVisionModels.slice(1),
        textModel: detected.defaultTextModels[0],
        audioSupported: false,
        allModelsCount: 0,
        latencyMs,
        error: `Connection failed: ${msg}`
      }
    }
  }

  async testConnection(candidateKey?: string): Promise<{
    success: boolean
    modelCount?: number
    latencyMs: number
    error?: string
  }> {
    const audit = await this.auditKey(candidateKey)
    return {
      success: audit.success,
      modelCount: audit.allModelsCount,
      latencyMs: audit.latencyMs,
      error: audit.error
    }
  }

  async listVisionModels(): Promise<string[]> {
    const audit = await this.auditKey()
    if (!audit.success) {
      return this.fallbackModels
    }
    return [audit.visionModel, ...audit.fallbackVisionModels]
  }

  /**
   * Whisper Audio Transcription
   * Sends audio data to /audio/transcriptions in memory with zero disk writes.
   */
  async transcribeAudio(
    audioBlob: Blob,
    modelOverride?: string
  ): Promise<{ text: string }> {
    if (!this.hasApiKey()) {
      throw new Error('API key is missing for audio transcription.')
    }

    const model = modelOverride || (this.provider === 'groq' ? 'whisper-large-v3' : 'whisper-1')
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', model)

    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Audio transcription failed (HTTP ${res.status}): ${errText || res.statusText}`)
    }

    const json = (await res.json()) as { text?: string }
    return { text: (json.text || '').trim() }
  }

  async complete(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<{ text: string; modelUsed: string }> {
    const modelsToTry = [
      options?.model || this.fallbackModels[0],
      ...this.fallbackModels.filter((m) => m !== (options?.model || this.fallbackModels[0]))
    ].slice(0, 4) // max 3 retries (4 attempts total)

    let lastError: unknown = null

    for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
      const currentModel = modelsToTry[attempt]

      if (!this.hasApiKey()) {
        throw new Error('API key is missing. Add it in Settings.')
      }

      try {
        const controller = new AbortController()
        const effectiveTimeout = options?.timeoutMs || 25000
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout)

        const payload: Record<string, unknown> = {
          model: currentModel,
          messages,
          temperature: options?.temperature ?? 0,
          max_tokens: options?.max_tokens ?? 1024
        }

        if (options?.response_format) {
          payload.response_format = options.response_format
        }

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (res.status === 429) {
          const retryHeader = res.headers.get('Retry-After')
          const retryAfter = retryHeader ? parseInt(retryHeader, 10) : undefined
          const err = new Error('HTTP 429 Too Many Requests') as Error & { status: number; retryAfter?: number }
          err.status = 429
          err.retryAfter = retryAfter
          throw err
        }

        if (!res.ok) {
          const err = new Error(`AI chat completion failed with HTTP ${res.status}`) as Error & { status: number }
          err.status = res.status
          if (
            (res.status === 400 || res.status === 404 || res.status === 410 || res.status === 422 || res.status >= 500) &&
            attempt < modelsToTry.length - 1
          ) {
            lastError = err
            const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50
            await new Promise((r) => setTimeout(r, backoff))
            continue
          }
          throw err
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: { content?: string | null; reasoning_content?: string | null }
          }>
        }
        const msg = data.choices?.[0]?.message
        let text = (msg?.content || '').trim()
        if (!text && msg?.reasoning_content) {
          text = msg.reasoning_content.trim()
        } else if (text && !text.includes('{') && msg?.reasoning_content && msg.reasoning_content.includes('{')) {
          // If reasoning contains JSON that was omitted from content
          const rStart = msg.reasoning_content.indexOf('{')
          const rEnd = msg.reasoning_content.lastIndexOf('}')
          if (rStart !== -1 && rEnd > rStart) {
            text = msg.reasoning_content.slice(rStart, rEnd + 1).trim()
          }
        }
        return { text, modelUsed: currentModel }
      } catch (err: unknown) {
        lastError = err
        const error = err as { status?: number; name?: string }
        const isAbort =
          error?.name === 'AbortError' ||
          (err instanceof Error && err.message.toLowerCase().includes('abort'))
        if (
          (isAbort ||
            error?.status === 400 ||
            error?.status === 404 ||
            error?.status === 422 ||
            (error?.status && error.status >= 500)) &&
          attempt < modelsToTry.length - 1
        ) {
          const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50
          await new Promise((r) => setTimeout(r, backoff))
          continue
        }
        throw err
      }
    }

    throw lastError || new Error('All model attempts failed')
  }
}

export const UniversalAiClient = NimClient
