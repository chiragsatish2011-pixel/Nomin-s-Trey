/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Standalone NVIDIA NIM Assistant Client for Trey Mobile.
 */

export interface NimMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class NimDirectService {
  private baseUrl = 'https://integrate.api.nvidia.com/v1'

  async completeChat(
    apiKey: string,
    messages: NimMessage[],
    model = 'meta/llama-3.3-70b-instruct'
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('NVIDIA NIM API key is not configured. Add your key in Settings.')
    }

    const systemPrompt: NimMessage = {
      role: 'system',
      content:
        'You are Trey, an intelligent, cheerful, and encouraging desktop and mobile focus companion built by The Nomin Company (founded by Chirag S). You keep answers crisp, friendly, and practical (under 3 sentences unless asked for details).'
    }

    const payload = {
      model,
      messages: [systemPrompt, ...messages],
      temperature: 0.6,
      max_tokens: 300
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`NIM request failed (${res.status}): ${errText || res.statusText}`)
    }

    interface ChatCompletionResponse {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }
    const json = (await res.json()) as ChatCompletionResponse
    const text = json.choices?.[0]?.message?.content || ''
    return text.trim()
  }
}

export const nimDirectService = new NimDirectService()
