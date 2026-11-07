import { createWorker, Worker } from 'tesseract.js'
import type { Ocr, OcrResult, OcrLine, OcrTarget } from '@nomin/core'

interface TesseractBBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface TesseractWord {
  text: string
  bbox: TesseractBBox
}

interface TesseractLine {
  text: string
  bbox: TesseractBBox
  words?: TesseractWord[]
}

interface TesseractData {
  lines?: TesseractLine[]
  text?: string
}

export class WindowsOcr implements Ocr {
  private worker: Worker | null = null
  private initializing: Promise<Worker> | null = null

  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker
    if (this.initializing) return this.initializing

    this.initializing = (async () => {
      const w = await createWorker('eng')
      this.worker = w
      return w
    })()

    return this.initializing
  }

  async recognize(imageBytes: Uint8Array): Promise<OcrResult> {
    const worker = await this.getWorker()
    const buffer = Buffer.from(imageBytes)

    const result = await worker.recognize(buffer)
    const data = result.data as unknown as TesseractData
    const lines: OcrLine[] = []
    let wordIndex = 0

    // Extract lines and words with exact bounding boxes
    if (data && Array.isArray(data.lines)) {
      data.lines.forEach((lineData: TesseractLine, lineIdx: number) => {
        const text = lineData.text.trim()
        if (!text) return

        const lineBox = {
          x: lineData.bbox.x0,
          y: lineData.bbox.y0,
          width: lineData.bbox.x1 - lineData.bbox.x0,
          height: lineData.bbox.y1 - lineData.bbox.y0
        }

        const lineTarget: OcrTarget = {
          id: `L${lineIdx + 1}`,
          text,
          rect: lineBox
        }

        const words: OcrTarget[] = (lineData.words || []).map((wordData: TesseractWord) => {
          wordIndex++
          return {
            id: `W${wordIndex}`,
            text: wordData.text.trim(),
            rect: {
              x: wordData.bbox.x0,
              y: wordData.bbox.y0,
              width: wordData.bbox.x1 - wordData.bbox.x0,
              height: wordData.bbox.y1 - wordData.bbox.y0
            }
          }
        })

        lines.push({
          line: lineTarget,
          words
        })
      })
    }

    return {
      lines: lines.slice(0, 140), // Swift limits to 140 lines
      fullText: data?.text || ''
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.initializing = null
    }
  }
}

export const windowsOcr = new WindowsOcr()
