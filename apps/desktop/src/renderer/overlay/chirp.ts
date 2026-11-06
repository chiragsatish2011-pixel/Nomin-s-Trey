/**
 * Cartoon chirp synthesizer using WebAudio.
 * Direct mathematical translation from Swift LiveVoice.swift:576-618.
 * Generates soft, round, bell-like pentatonic notes with upward scoop and subtle wobble.
 */
export function playChirp(volume = 0.85, syllables = 3): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const rate = ctx.sampleRate

    // C major pentatonic, dropped an octave: [1046.5, ...] * 0.5
    const scale = [523.25, 587.35, 659.25, 784.0, 880.0, 1046.5, 1174.65, 1318.5]
    let index = Math.floor(Math.random() * 3) + 1
    const samples: number[] = []

    for (let i = 0; i < syllables; i++) {
      if (i > 0) {
        const step = [-1, 1, 1, 2][Math.floor(Math.random() * 4)]
        index = Math.min(Math.max(index + step, 0), scale.length - 1)
      }
      const note = scale[index]
      const duration = i === syllables - 1 ? 0.13 : 0.07 + Math.random() * 0.02
      const count = Math.floor(duration * rate)
      let phase = 0

      for (let n = 0; n < count; n++) {
        const time = n / rate
        const t = n / count
        // Scoops up into the note over the first 25 ms, with a gentle wobble on the last one.
        const scoop = 1 - 0.18 * Math.exp(-time / 0.012)
        const wobble = i === syllables - 1 ? 1 + 0.012 * Math.sin(time * 2 * Math.PI * 18) : 1
        phase += (2 * Math.PI * note * scoop * wobble) / rate
        const attack = Math.min(1, time / 0.006)
        const envelope = attack * Math.exp(-t * 3.2) * (1 - Math.pow(t, 6))
        const wave = Math.sin(phase) + 0.12 * Math.sin(2 * phase)
        samples.push(wave * envelope * 0.26 * volume)
      }

      // 28ms silence between syllables
      const silenceCount = Math.floor(rate * 0.028)
      for (let s = 0; s < silenceCount; s++) {
        samples.push(0)
      }
    }

    const buffer = ctx.createBuffer(1, samples.length, rate)
    const channelData = buffer.getChannelData(0)
    for (let j = 0; j < samples.length; j++) {
      channelData[j] = samples[j]
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => {
      ctx.close().catch(() => {})
    }
    source.start()
  } catch (err) {
    console.warn('WebAudio chirp synthesis failed:', err)
  }
}
