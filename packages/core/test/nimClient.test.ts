import { describe, expect, it } from 'vitest'
import { NimClient, detectProvider } from '../src/ai/NimClient.js'

describe('NimClient model selection', () => {
  it('keeps fallback vision models when only the active model changes', () => {
    const client = new NimClient('test-key', { fallbackModels: ['vision-a', 'vision-b'] })
    client.setModel('vision-selected')

    expect(client.getModels()).toEqual(['vision-selected', 'vision-a', 'vision-b'])
  })

  it('uses an explicitly supplied fallback list when one is provided', () => {
    const client = new NimClient('test-key', { fallbackModels: ['old-model'] })
    client.setModel('vision-selected', ['vision-fallback'])

    expect(client.getModels()).toEqual(['vision-selected', 'vision-fallback'])
  })
})

describe('Universal Provider Detection', () => {
  it('detects NVIDIA NIM from nvapi- prefix', () => {
    const res = detectProvider('nvapi-1234567890abcdef')
    expect(res.provider).toBe('nim')
    expect(res.baseUrl).toBe('https://integrate.api.nvidia.com/v1')
  })

  it('detects OpenAI from sk- prefix', () => {
    const res = detectProvider('sk-proj-1234567890')
    expect(res.provider).toBe('openai')
    expect(res.baseUrl).toBe('https://api.openai.com/v1')
    expect(res.defaultVisionModels).toContain('gpt-4o')
  })

  it('detects OpenRouter from sk-or- prefix', () => {
    const res = detectProvider('sk-or-v1-abcdef123456')
    expect(res.provider).toBe('openrouter')
    expect(res.baseUrl).toBe('https://openrouter.ai/api/v1')
  })

  it('detects Groq from gsk_ prefix', () => {
    const res = detectProvider('gsk_abcdef123456')
    expect(res.provider).toBe('groq')
    expect(res.baseUrl).toBe('https://api.groq.com/openai/v1')
  })

  it('respects custom baseUrl', () => {
    const res = detectProvider('any-key', 'http://localhost:11434/v1')
    expect(res.provider).toBe('custom')
    expect(res.baseUrl).toBe('http://localhost:11434/v1')
  })

  it('reports audit error on empty key', async () => {
    const client = new NimClient('')
    const audit = await client.auditKey('')
    expect(audit.success).toBe(false)
    expect(audit.error).toContain('missing or empty')
  })
})
