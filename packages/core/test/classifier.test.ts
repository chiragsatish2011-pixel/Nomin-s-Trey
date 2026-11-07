import { describe, it, expect } from 'vitest'
import { Classifier } from '../src/ai/Classifier.js'
import { NudgeWriter } from '../src/ai/NudgeWriter.js'

describe('Classifier and NudgeWriter parsing contracts', () => {
  it('parses clean JSON from classifier', () => {
    const raw = `{"choice":"off_task","p_off_task":0.85,"p_on_task":0.10,"p_uncertain":0.05,"confidence":0.75}`
    const result = Classifier.parseResponse(raw)

    expect(result.choice).toBe('off_task')
    expect(result.p_off_task).toBe(0.85)
    expect(result.confidence).toBe(0.75)
  })

  it('strips markdown code fences from model response', () => {
    const raw = `\`\`\`json
{"choice":"on_task","p_off_task":0.05,"p_on_task":0.90,"p_uncertain":0.05,"confidence":0.88}
\`\`\``
    const result = Classifier.parseResponse(raw)

    expect(result.choice).toBe('on_task')
    expect(result.p_on_task).toBe(0.9)
  })

  it('clamps out-of-range probabilities defensively', () => {
    const raw = `{"choice":"uncertain","p_off_task":-0.2,"p_on_task":1.5,"p_uncertain":0.5,"confidence":2.0}`
    const result = Classifier.parseResponse(raw)

    expect(result.p_off_task).toBe(0)
    expect(result.p_on_task).toBe(1)
    expect(result.confidence).toBe(1)
  })

  it('throws on malformed JSON without object', () => {
    expect(() => Classifier.parseResponse('I am not sure what is happening.')).toThrow()
  })

  it('parses nudge response and extracts valid target_id and quote', () => {
    const raw = `{"message":"Hey, this doesn't look like building Trey.","target_id":"L14","target_quote":"Trending news on Twitter"}`
    const nudge = NudgeWriter.parseResponse(raw)

    expect(nudge.message).toBe("Hey, this doesn't look like building Trey.")
    expect(nudge.targetId).toBe('L14')
    expect(nudge.targetQuote).toBe('Trending news on Twitter')
  })

  it('falls back to default sentence when message exceeds limits or is malformed', () => {
    const raw = `{"message":"This message is way way way too long and rambling and full of unnecessary filler words that violate the 18 word limit rule designed for Trey's gentle speech bubbles to ensure it does not overwhelm the user.","target_id":null,"target_quote":null}`
    const nudge = NudgeWriter.parseResponse(raw)

    expect(nudge.message).toBe("Are you sure you're on task right now?")
    expect(nudge.targetId).toBeNull()
  })
})
