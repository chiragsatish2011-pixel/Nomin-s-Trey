import { Rect } from './CoordinateMath.js'
import { NotImplementedError } from './Capabilities.js'

export interface OcrTarget {
  id: string
  text: string
  rect: Rect
}

export interface OcrLine {
  line: OcrTarget
  words: OcrTarget[]
}

export interface OcrResult {
  lines: OcrLine[]
  fullText: string
}

export interface Ocr {
  recognize(imageBytes: Uint8Array): Promise<OcrResult>
}

export class LinuxOcrStub implements Ocr {
  async recognize(): Promise<OcrResult> {
    throw new NotImplementedError('Ocr', 'linux')
  }
}

export class AndroidOcrStub implements Ocr {
  async recognize(): Promise<OcrResult> {
    throw new NotImplementedError('Ocr', 'android')
  }
}
