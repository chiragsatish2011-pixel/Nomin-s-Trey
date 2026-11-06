import { describe, it, expect, vi } from 'vitest'
import { Researcher } from '../src/ai/Researcher.js'
import { NimClient } from '../src/ai/NimClient.js'
import { NimGovernor } from '../src/ai/NimGovernor.js'

describe('Researcher', () => {
  it('parses structured JSON research report', async () => {
    const client = new NimClient('test-key')
    const governor = new NimGovernor(30)
    const researcher = new Researcher(client, governor)

    vi.spyOn(client, 'complete').mockResolvedValueOnce({
      modelUsed: 'meta/llama-3.2-11b-vision-instruct',
      text: JSON.stringify({
        title: 'Electron Multi-Window Architecture',
        paragraphs: [
          'Electron applications use a main process to orchestrate multiple BrowserWindow instances.',
          'IPC communication bridges renderers safely through preload scripts with contextIsolation.'
        ],
        sources: [
          { title: 'Electron Docs', url: 'https://www.electronjs.org/docs/latest' }
        ],
        takeaway: 'Trey uses isolated windows coordinated by a typed main process.'
      })
    })

    const report = await researcher.research('How does Electron manage multiple windows?')

    expect(report.title).toBe('Electron Multi-Window Architecture')
    expect(report.paragraphs.length).toBe(2)
    expect(report.sources.length).toBe(1)
    expect(report.sources[0].url).toBe('https://www.electronjs.org/docs/latest')
    expect(report.takeaway).toBe('Trey uses isolated windows coordinated by a typed main process.')
    expect(report.plainText).toContain('Electron Multi-Window Architecture')
  })
})
