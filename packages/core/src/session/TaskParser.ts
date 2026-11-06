export type VoiceCommandType = 'pause' | 'resume' | 'end' | 'time_left'

export interface ParsedVoiceResult {
  isCommand: boolean
  command?: VoiceCommandType
  task?: string
  minutes?: number
}

export class TaskParser {
  /**
   * Parses voice transcript for commands or task description with duration.
   */
  static parse(transcript: string): ParsedVoiceResult {
    const text = transcript.trim()
    if (!text) {
      return { isCommand: false, task: 'Focus session', minutes: 30 }
    }

    const lower = text.toLowerCase()

    // 1. Check Voice Commands
    if (/^\s*(pause|hold on|take a break|pause focus)\s*$/i.test(lower)) {
      return { isCommand: true, command: 'pause' }
    }
    if (/^\s*(resume|continue|back to work|carry on|resume focus)\s*$/i.test(lower)) {
      return { isCommand: true, command: 'resume' }
    }
    if (/^\s*(end|stop|finish|wrap up|end focus)\s*$/i.test(lower)) {
      return { isCommand: true, command: 'end' }
    }
    if (/how much time|time left|time remaining/i.test(lower)) {
      return { isCommand: true, command: 'time_left' }
    }

    // 2. Extract Duration
    let minutes = 30 // default

    if (/\b(?:half an hour|half hour)\b/i.test(lower)) {
      minutes = 30
    } else if (/\b(?:an hour and a half|1\.5 hours)\b/i.test(lower)) {
      minutes = 90
    } else if (/\b(?:an hour|one hour|1 hour)\b/i.test(lower)) {
      minutes = 60
    } else {
      const hoursMatch = lower.match(/\b(\d+)\s*(?:hours?|hrs?)\b/i)
      if (hoursMatch) {
        minutes = parseInt(hoursMatch[1], 10) * 60
      } else {
        const minsMatch = lower.match(/\b(\d+)\s*(?:minutes?|mins?)\b/i)
        if (minsMatch) {
          minutes = parseInt(minsMatch[1], 10)
        }
      }
    }

    // Clamp duration between 1 and 240 minutes
    minutes = Math.max(1, Math.min(240, minutes))

    // 3. Clean Task Description
    let cleanTask = text
      // Remove duration phrases
      .replace(/\b(?:for\s+)?(?:\d+\s*(?:minutes?|mins?|hours?|hrs?)|an hour|half an hour|one hour|an hour and a half)\b/gi, '')
      // Remove conversational prefixes
      .replace(/^(?:i am|i'm|im|let's|lets|we are|we're|i want to|gonna|going to|focusing on|working on)\s+/i, '')
      .trim()

    // Clean up trailing punctuation
    cleanTask = cleanTask.replace(/[.,;!?]+$/, '').trim()

    if (!cleanTask) {
      cleanTask = 'Focus session'
    }

    return {
      isCommand: false,
      task: cleanTask,
      minutes
    }
  }
}
