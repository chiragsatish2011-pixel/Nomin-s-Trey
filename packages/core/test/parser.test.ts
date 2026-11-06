import { describe, it, expect } from 'vitest'
import { TaskParser } from '../src/session/TaskParser.js'

describe('TaskParser voice transcript extraction', () => {
  it("extracts task and minutes from 'I\\'m editing a video for 45 minutes'", () => {
    const res = TaskParser.parse("I'm editing a video for 45 minutes")
    expect(res.isCommand).toBe(false)
    expect(res.task).toBe('editing a video')
    expect(res.minutes).toBe(45)
  })

  it("handles hours ('an hour', '2 hours', 'half an hour')", () => {
    const r1 = TaskParser.parse('Making a Codex video for an hour')
    expect(r1.task).toBe('Making a Codex video')
    expect(r1.minutes).toBe(60)

    const r2 = TaskParser.parse('Deep work for 2 hours')
    expect(r2.task).toBe('Deep work')
    expect(r2.minutes).toBe(120)

    const r3 = TaskParser.parse('Reviewing PRs for half an hour')
    expect(r3.task).toBe('Reviewing PRs')
    expect(r3.minutes).toBe(30)
  })

  it('clamps durations between 1 and 240 minutes and defaults to 30', () => {
    const def = TaskParser.parse('Building features in TypeScript')
    expect(def.minutes).toBe(30)

    const long = TaskParser.parse('Studying for 10 hours')
    expect(long.minutes).toBe(240) // clamped to 240
  })

  it('recognizes voice commands (pause, resume, end, time left)', () => {
    expect(TaskParser.parse('pause').command).toBe('pause')
    expect(TaskParser.parse('hold on').command).toBe('pause')
    expect(TaskParser.parse('resume').command).toBe('resume')
    expect(TaskParser.parse('back to work').command).toBe('resume')
    expect(TaskParser.parse('end focus').command).toBe('end')
    expect(TaskParser.parse('how much time left').command).toBe('time_left')
  })
})
