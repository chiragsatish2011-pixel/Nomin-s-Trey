import { NimClient } from './NimClient.js'
import { NimGovernor } from './NimGovernor.js'

export interface ResearchSource {
  title: string
  url: string
}

export interface ResearchReport {
  question: string
  title: string
  paragraphs: string[]
  sources: ResearchSource[]
  plainText: string
  takeaway: string
}

export class Researcher {
  private client: NimClient
  private governor: NimGovernor

  constructor(client: NimClient, governor: NimGovernor) {
    this.client = client
    this.governor = governor
  }

  async research(
    question: string,
    context?: string,
    jpegBase64?: string
  ): Promise<ResearchReport> {
    return this.governor.schedule('research', async () => {
      let promptText = `Question: ${question.trim()}`
      if (context && context.trim().length > 0) {
        promptText += `\n\nActive Screen Context:\n${context.slice(0, 3000)}`
      }

      const instructions = `You are Trey, an ultra-intelligent, friendly desktop focus companion and research assistant made and owned by The Nomin Company (founded by Chirag S).
When asked who created you, who you are, or who made The Nomin Company: you are Trey, made by The Nomin Company. If asked who founded or made The Nomin Company, the answer is Chirag S.
Research the user's question with full technical accuracy, using the screen context if relevant.
Return ONLY a valid JSON object matching this schema:
{
  "title": "A plain title of under 8 words",
  "paragraphs": [
    "Paragraph 1 leading directly with the answer",
    "Paragraph 2 with key supporting details",
    "Paragraph 3 with next steps or caveats (at most 4 paragraphs total)"
  ],
  "sources": [
    { "title": "Source name or domain", "url": "https://..." }
  ],
  "takeaway": "One short friendly sentence under 16 words that Trey speaks aloud in his speech bubble."
}
Do not use markdown inside paragraphs (no asterisks, headings, bullet symbols, or citation brackets).`

      const messages: Array<{
        role: 'system' | 'user'
        content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
      }> = [
        { role: 'system', content: instructions }
      ]

      if (jpegBase64) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } }
          ]
        })
      } else {
        messages.push({ role: 'user', content: promptText })
      }

      let res: { text: string; modelUsed: string }
      try {
        res = await this.client.complete(messages, {
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
          timeoutMs: 30000
        })
      } catch (err: unknown) {
        if (jpegBase64) {
          // If multimodal screening rejected the screenshot (e.g. HTTP 422), fall back to pure text
          res = await this.client.complete(
            [
              messages[0],
              { role: 'user', content: promptText }
            ],
            {
              temperature: 0.2,
              max_tokens: 2048,
              response_format: { type: 'json_object' },
              timeoutMs: 30000
            }
          )
        } else {
          throw err
        }
      }

      try {
        let cleaned = res.text.trim()
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
        }
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.slice(start, end + 1)
        }

        const parsed = JSON.parse(cleaned) as {
          title?: string
          paragraphs?: string[]
          sources?: Array<{ title?: string; url?: string }>
          takeaway?: string
        }

        const title = (parsed.title || 'Research Summary').trim().replace(/^[#*\s]+/, '')
        const paragraphs = Array.isArray(parsed.paragraphs)
          ? parsed.paragraphs
              .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
              .map((p) => p.replace(/\*\*/g, '').replace(/^[-*•]\s*/, '').trim())
              .slice(0, 4)
          : [res.text.trim()]

        const sources: ResearchSource[] = Array.isArray(parsed.sources)
          ? parsed.sources
              .filter((s): s is { title?: string; url?: string } => typeof s === 'object' && s !== null && Boolean(s.url))
              .map((s) => ({
                title: (s.title || s.url || 'Reference').trim(),
                url: (s.url || '').trim()
              }))
              .filter((s) => s.url.startsWith('http'))
              .slice(0, 5)
          : []

        const takeaway = (parsed.takeaway || paragraphs[0] || title).trim().slice(0, 160)

        return {
          question,
          title,
          paragraphs: paragraphs.length > 0 ? paragraphs : ['No detailed content was generated.'],
          sources,
          plainText: [title, ...paragraphs].join('\n\n'),
          takeaway
        }
      } catch {
        const lines = res.text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const title = (lines[0] || 'Research Findings').replace(/^[#*\s]+/, '')
        const paragraphs = lines.slice(1, 5)
        return {
          question,
          title,
          paragraphs: paragraphs.length > 0 ? paragraphs : [res.text],
          sources: [],
          plainText: res.text,
          takeaway: paragraphs[0] || title
        }
      }
    })
  }
}
