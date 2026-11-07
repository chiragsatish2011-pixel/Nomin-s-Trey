/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Automated regression test: Enforces zero emojis in apps/desktop/src/
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

function getSourceFiles(dir: string): string[] {
  const files: string[] = []
  if (!dir) return files

  function traverse(current: string) {
    const entries = readdirSync(current)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'out' || entry === 'dist' || entry === '.git') continue
      const full = join(current, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        traverse(full)
      } else if (/\.(ts|tsx|js|jsx|html|css)$/.test(entry)) {
        files.push(full)
      }
    }
  }

  traverse(dir)
  return files
}

describe('Zero-Emoji Design System Policy', () => {
  it('enforces that apps/desktop/src contains zero emojis in any UI, strings, or comments', () => {
    // Regex matching standard emoji unicode ranges and symbols
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u

    const srcDir = resolve(__dirname, '../../../apps/desktop/src')
    const files = getSourceFiles(srcDir)
    expect(files.length).toBeGreaterThan(0)

    const violations: Array<{ file: string; line: number; char: string; snippet: string }> = []

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        const match = emojiRegex.exec(line)
        if (match) {
          violations.push({
            file: file.replace(resolve(__dirname, '../../../'), ''),
            line: idx + 1,
            char: match[0],
            snippet: line.trim().slice(0, 80)
          })
        }
      })
    }

    if (violations.length > 0) {
      const report = violations.map((v) => `  ${v.file}:${v.line} -> "${v.char}" in: ${v.snippet}`).join('\n')
      expect.fail(`Found ${violations.length} emoji violations in desktop sources:\n${report}`)
    }

    expect(violations.length).toBe(0)
  })
})
