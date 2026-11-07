import React, { useEffect, useRef } from 'react'

export type TreyMood = 'listening' | 'talking' | 'pointing' | 'thinking' | 'happy' | 'resting' | 'sleepy'
export type TreyCharacterMode = 'contained' | 'rising-sun'

export interface TreyCharacterProps {
  mood?: TreyMood
  mode?: TreyCharacterMode
  talkLevel?: number
  gazePoint?: { x: number; y: number } // -1 to 1 normalized, or screen coordinates
  className?: string
  style?: React.CSSProperties
  interactive?: boolean
  userScale?: number
  onClick?: () => void
}

class Spring {
  value: number
  velocity = 0
  stiffness: number
  damping: number

  constructor(value: number, stiffness = 200, damping = 0.7) {
    this.value = value
    this.stiffness = stiffness
    this.damping = damping
  }

  step(target: number, dt: number): void {
    const c = 2 * Math.sqrt(this.stiffness) * this.damping
    this.velocity += (this.stiffness * (target - this.value) - c * this.velocity) * dt
    this.value += this.velocity * dt
  }
}

export const TreyCharacter: React.FC<TreyCharacterProps> = ({
  mood = 'listening',
  mode = 'contained',
  talkLevel = 0,
  gazePoint,
  className,
  style,
  interactive = true,
  userScale = 1.0,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Harmonic physical springs for gaze and expression motion
  const springs = useRef({
    gazeX: new Spring(0, 260, 0.82),
    gazeY: new Spring(0, 260, 0.82),
    pupil: new Spring(1, 160, 0.5),
    browLift: new Spring(0, 180, 0.55),
    browTilt: new Spring(0, 150, 0.6),
    lean: new Spring(0, 60, 0.8),
    hop: new Spring(0, 260, 0.35),
    blush: new Spring(0.25, 40, 1.0),
    squint: new Spring(0, 150, 0.7)
  })

  const animState = useRef({
    lastTime: performance.now() / 1000,
    currentMood: mood,
    talk: talkLevel,
    blinkStart: -1,
    doubleBlink: false,
    nextBlink: performance.now() / 1000 + 2.5,
    wanderTarget: { x: 0, y: -0.2 },
    nextSaccade: 0,
    jitter: { x: 0, y: 0 },
    nextJitter: 0,
    nextHop: performance.now() / 1000 + 8.0,
    mouseGaze: null as { x: number; y: number } | null
  })

  // Update props ref
  const propsRef = useRef({ mood, mode, talkLevel, gazePoint, userScale })
  useEffect(() => {
    propsRef.current = { mood, mode, talkLevel, gazePoint, userScale }
  }, [mood, mode, talkLevel, gazePoint, userScale])

  useEffect(() => {
    let animFrame: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const renderLoop = (timeMs: number) => {
      const now = timeMs / 1000
      const st = animState.current
      const sp = springs.current
      const dt = Math.min(now - st.lastTime, 1 / 20)
      st.lastTime = now

      const activeMood = propsRef.current.mood || 'listening'
      if (activeMood !== st.currentMood) {
        st.currentMood = activeMood
        st.blinkStart = now
        if (activeMood !== 'sleepy' && activeMood !== 'resting') {
          sp.hop.velocity += 240
          sp.pupil.velocity += 2.5
        }
      }

      // Gaze target logic
      let wantX = 0
      let wantY = 0

      if (propsRef.current.gazePoint) {
        wantX = propsRef.current.gazePoint.x
        wantY = propsRef.current.gazePoint.y
      } else if (st.mouseGaze) {
        wantX = st.mouseGaze.x
        wantY = st.mouseGaze.y
      } else {
        if (now > st.nextSaccade) {
          st.wanderTarget = {
            x: (Math.random() - 0.5) * 1.6,
            y: (Math.random() - 0.5) * 1.0 - 0.2
          }
          st.nextSaccade = now + 1.2 + Math.random() * 1.8
        }
        wantX = st.wanderTarget.x
        wantY = st.wanderTarget.y
      }

      if (activeMood === 'thinking') {
        wantX = 0.6 + 0.08 * Math.sin(now * 1.3)
        wantY = -0.85
      }

      // Micro-jitter so eyes stay vibrant
      if (now > st.nextJitter) {
        const amount = activeMood === 'talking' ? 0.05 : activeMood === 'thinking' ? 0.04 : 0.018
        st.jitter = {
          x: (Math.random() - 0.5) * 2 * amount,
          y: (Math.random() - 0.5) * 2 * amount
        }
        st.nextJitter = now + 0.6 + Math.random() * 0.9
      }

      sp.gazeX.step(wantX + st.jitter.x, dt)
      sp.gazeY.step(wantY + st.jitter.y, dt)

      // Talk smoothing
      const wantTalk = Math.max(propsRef.current.talkLevel || 0, activeMood === 'talking' ? 0.4 + 0.3 * Math.sin(now * 16) : 0)
      st.talk += (wantTalk - st.talk) * Math.min(1, dt * 25)

      // Mood spring targets
      let wantPupil = 1.0
      let wantLift = 0.0
      let wantTilt = 0.0
      let wantBlush = 0.25
      let wantSquint = 0.0

      switch (activeMood) {
        case 'listening':
          wantPupil = 1.12
          wantLift = 10
          break
        case 'talking':
          wantPupil = 1.05
          wantLift = 6 + st.talk * 18
          wantTilt = 0.05 * Math.sin(now * 2.3)
          break
        case 'pointing':
          wantPupil = 0.95
          wantLift = -4
          wantTilt = -0.14
          break
        case 'thinking':
          wantPupil = 0.9
          wantLift = 4
          wantTilt = 0.22
          break
        case 'happy':
          wantPupil = 1.2
          wantLift = 16
          wantBlush = 0.85
          wantSquint = 1.0
          break
        case 'resting':
          wantPupil = 0.9
          wantLift = -8
          wantBlush = 0.15
          break
        case 'sleepy':
          wantPupil = 0.88
          wantLift = -10
          wantTilt = 0.12
          wantBlush = 0.15
          break
      }

      sp.pupil.step(wantPupil, dt)
      sp.browLift.step(wantLift, dt)
      sp.browTilt.step(wantTilt, dt)
      sp.blush.step(wantBlush, dt)
      sp.squint.step(wantSquint, dt)
      sp.lean.step(-sp.gazeX.value * 0.045, dt)

      // Occasional happy hop
      if (now > st.nextHop) {
        if (st.talk < 0.05 && activeMood !== 'sleepy' && activeMood !== 'resting') {
          sp.hop.velocity += 180 + Math.random() * 120
        }
        st.nextHop = now + 8 + Math.random() * 8
      }
      sp.hop.step(0, dt)

      // Blinks with occasional double-blink
      const drowsy = activeMood === 'sleepy'
      if (now > st.nextBlink) {
        st.blinkStart = now
        st.doubleBlink = !drowsy && Math.random() < 0.25
        st.nextBlink = now + (drowsy ? 1.8 + Math.random() * 1.5 : 2.5 + Math.random() * 3.5)
      }
      const p = (now - st.blinkStart) / (drowsy ? 0.7 : 0.15)
      let closed = p >= 0 && p <= 1 ? Math.sin(Math.PI * p) : 0
      if (st.doubleBlink && p >= 1.3 && p <= 2.3) {
        closed = Math.sin(Math.PI * (p - 1.3))
      }

      const breathe = Math.sin(now * (activeMood === 'resting' ? 1.1 : 1.8))

      // CANVAS DRAWING
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      const isRisingSun = propsRef.current.mode === 'rising-sun'

      // Mode-specific geometry
      // Rising Sun mode: fills the screen and arches up from bottom edge (video frames 1, 6, 9)
      // Contained mode: plump round berry fitting cleanly inside transparent window with safe margin
      let scale = 1.0
      let transX = 0
      let transY = 0
      let body = { x: 38, y: 38, w: 768, h: 520 }
      let crownX = 0
      let crownY = 0
      let eyeY = 0
      let eyeCenters: Array<{ x: number; y: number }> = []
      let noseX = 0
      let noseY = 0

      if (isRisingSun) {
        const designW = 844
        const designH = 460
        // Horizon scale: Trey rises elegantly from the bottom with plenty of clear headroom
        const baseScale = Math.min(width / designW, (height * 0.88) / designH) * 1.02
        scale = baseScale * (propsRef.current.userScale || 1.0)
        transX = (width - designW * scale) / 2
        transY = height - designH * scale * 0.84

        const bounce = -st.talk * 16 + breathe * 3 - sp.hop.value
        body = { x: 12, y: 44 + bounce, w: 820, h: 700 }
        crownX = body.x + 368
        crownY = body.y - 20 - sp.browLift.value * 0.3
        eyeY = body.y + 157
        eyeCenters = [
          { x: body.x + 280, y: eyeY },
          { x: body.x + 540, y: eyeY }
        ]
        const noseW = 60 - st.talk * 8
        noseX = body.x + 410 - noseW / 2
        noseY = body.y + 272 - st.talk * 6
      } else {
        const designW = 844
        const designH = 600
        const padding = 20
        const baseScale = Math.min((width - padding * 2) / designW, (height - padding * 2) / designH)
        scale = baseScale * (propsRef.current.userScale || 1.0) * 0.82
        transX = (width - designW * scale) / 2
        transY = (height - designH * scale) / 2

        const bounce = -st.talk * 14 + breathe * 3 - sp.hop.value
        body = { x: 38, y: 38 + bounce, w: 768, h: 520 }
        crownX = body.x + body.w / 2 - 42
        crownY = body.y - 18 - sp.browLift.value * 0.3
        eyeY = body.y + 155
        eyeCenters = [
          { x: body.x + 250, y: eyeY },
          { x: body.x + body.w - 250, y: eyeY }
        ]
        const noseW = 56 - st.talk * 8
        noseX = body.x + body.w / 2 - noseW / 2
        noseY = body.y + 265 - st.talk * 6
      }

      ctx.translate(transX, transY)
      ctx.scale(scale, scale)

      // Whole body bounce & lean
      const pivot = { x: body.x + body.w / 2, y: body.y + body.h }

      ctx.save()
      ctx.translate(pivot.x, pivot.y)
      ctx.rotate(sp.lean.value)
      const stretch = 1 + Math.min(0.03, Math.max(-0.03, sp.hop.value / 900))
      ctx.scale(2 - stretch, stretch)
      ctx.translate(-pivot.x, -pivot.y)

      // Blueberry organic blob shape (4 cubic beziers)
      const tl = { w: 0.52 * body.w, h: 0.58 * body.h }
      const tr = { w: 0.48 * body.w, h: 0.56 * body.h }
      const br = { w: 0.46 * body.w, h: 0.44 * body.h }
      const bl = { w: 0.54 * body.w, h: 0.42 * body.h }
      const k = 0.5523

      ctx.beginPath()
      ctx.moveTo(body.x + tl.w, body.y)
      ctx.lineTo(body.x + body.w - tr.w, body.y)
      ctx.bezierCurveTo(
        body.x + body.w - tr.w * (1 - k), body.y,
        body.x + body.w, body.y + tr.h * (1 - k),
        body.x + body.w, body.y + tr.h
      )
      ctx.lineTo(body.x + body.w, body.y + body.h - br.h)
      ctx.bezierCurveTo(
        body.x + body.w, body.y + body.h - br.h * (1 - k),
        body.x + body.w - br.w * (1 - k), body.y + body.h,
        body.x + body.w - br.w, body.y + body.h
      )
      ctx.lineTo(body.x + bl.w, body.y + body.h)
      ctx.bezierCurveTo(
        body.x + bl.w * (1 - k), body.y + body.h,
        body.x, body.y + body.h - bl.h * (1 - k),
        body.x, body.y + body.h - bl.h
      )
      ctx.lineTo(body.x, body.y + tl.h)
      ctx.bezierCurveTo(
        body.x, body.y + tl.h * (1 - k),
        body.x + tl.w * (1 - k), body.y,
        body.x + tl.w, body.y
      )
      ctx.closePath()

      // Blueberry linear gradient at 150°
      const grad = ctx.createLinearGradient(
        body.x + 0.25 * body.w, body.y + 0.067 * body.h,
        body.x + 0.75 * body.w, body.y + 0.933 * body.h
      )
      grad.addColorStop(0, '#A9BCFF')
      grad.addColorStop(0.34, '#6C86F5')
      grad.addColorStop(0.68, '#4254D6')
      grad.addColorStop(1, '#2B2F8F')

      ctx.fillStyle = grad
      ctx.fill()

      // Radial specular shine
      ctx.save()
      ctx.clip()
      const shine = ctx.createRadialGradient(
        body.x + 240, body.y + 120, 0,
        body.x + 240, body.y + 120, 230
      )
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shine
      ctx.fill()

      // Glossy sparkle on head
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(body.x + 200, body.y + 46, 22, 11, -0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.fill()
      ctx.restore()
      ctx.restore()

      // Calyx Crown (Blueberry leaves on top)
      const crownW = 84
      const crownH = 56
      const crownPts = [
        [30, 4], [36, 16], [52, 12], [40, 24], [46, 36],
        [30, 28], [14, 36], [20, 24], [8, 12], [24, 16]
      ]
      ctx.beginPath()
      crownPts.forEach(([px, py], i) => {
        const cx = crownX + (px / 60) * crownW
        const cy = crownY + (py / 40) * crownH
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      })
      ctx.closePath()
      ctx.fillStyle = '#1C1F66'
      ctx.fill()

      const squash = 1 - st.talk * 0.12

      // Blushing cheeks
      eyeCenters.forEach((c, i) => {
        const side = i === 0 ? -1 : 1
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(c.x - 45 + side * 58, c.y + 92, 42, 20, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(243, 166, 216, ${0.22 + 0.48 * sp.blush.value})`
        ctx.filter = 'blur(10px)'
        ctx.fill()
        ctx.restore()
      })

      // Draw eyebrows and eyes
      eyeCenters.forEach((c, i) => {
        const side = i === 0 ? -1 : 1

        // Eyebrows
        ctx.save()
        const browY = c.y - 108 - Math.min(18, Math.max(-10, sp.browLift.value)) * 0.7
        ctx.translate(c.x + side * 6, browY)
        const tiltAngle = sp.browTilt.value * side * -1 + (activeMood === 'thinking' && i === 1 ? -0.25 : 0)
        ctx.rotate(tiltAngle)
        ctx.beginPath()
        ctx.moveTo(-36, 6)
        ctx.quadraticCurveTo(0, -12, 36, 6)
        ctx.strokeStyle = '#1C1F66'
        ctx.lineWidth = 14
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()

        // Eye state
        if (activeMood === 'resting') {
          // Closed peaceful curve
          ctx.beginPath()
          ctx.moveTo(c.x - 58, c.y + 6)
          ctx.quadraticCurveTo(c.x, c.y + 48, c.x + 58, c.y + 6)
          ctx.strokeStyle = '#17151F'
          ctx.lineWidth = 18
          ctx.lineCap = 'round'
          ctx.stroke()
        } else if (activeMood === 'happy' && sp.squint.value > 0.6) {
          // Joyful squinting crescents
          ctx.beginPath()
          ctx.moveTo(c.x - 56, c.y + 32)
          ctx.quadraticCurveTo(c.x, c.y - 50, c.x + 56, c.y + 32)
          ctx.strokeStyle = '#17151F'
          ctx.lineWidth = 22
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          // Open expressive eyes
          const open = Math.max(0.06, 1 - closed) * squash
          const eyeR = 88
          const eyeRy = eyeR * open

          // Sclera
          ctx.beginPath()
          ctx.ellipse(c.x, c.y, eyeR, eyeRy, 0, 0, Math.PI * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()

          if (open > 0.2) {
            ctx.save()
            ctx.beginPath()
            ctx.ellipse(c.x, c.y, eyeR, eyeRy, 0, 0, Math.PI * 2)
            ctx.clip()

            // Gaze offset
            let gx = sp.gazeX.value
            let gy = sp.gazeY.value
            const gLen = Math.hypot(gx, gy)
            if (gLen > 1) {
              gx /= gLen
              gy /= gLen
            }

            const reach = 46
            const r = 44 * sp.pupil.value
            const pupilX = c.x + gx * reach - side * 3
            let pupilY = c.y + gy * reach * open

            if (activeMood === 'sleepy') {
              pupilY = Math.max(pupilY, c.y) + 26
            }

            // Dark pupil
            ctx.beginPath()
            ctx.ellipse(pupilX, pupilY, r, r, 0, 0, Math.PI * 2)
            ctx.fillStyle = '#17151F'
            ctx.fill()

            // Dual catchlights
            ctx.beginPath()
            ctx.ellipse(pupilX - r * 0.58, pupilY - r * 0.72, r * 0.28, r * 0.28, 0, 0, Math.PI * 2)
            ctx.fillStyle = '#FFFFFF'
            ctx.fill()

            ctx.beginPath()
            ctx.ellipse(pupilX + r * 0.28, pupilY + r * 0.22, r * 0.12, r * 0.12, 0, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
            ctx.fill()

            // Happy squint cheek pushed up from below
            if (sp.squint.value > 0.02) {
              ctx.beginPath()
              ctx.ellipse(c.x, c.y + 88 * open - 65 * sp.squint.value, 105, 75, 0, 0, Math.PI * 2)
              ctx.fillStyle = grad
              ctx.fill()
            }

            // Sleepy droop lid
            if (activeMood === 'sleepy') {
              const droop = 0.5 + 0.06 * Math.sin(now * 1.3)
              ctx.beginPath()
              ctx.rect(c.x - 95, c.y - eyeRy - 10, 190, eyeRy * 2 * droop + 10)
              ctx.fillStyle = grad
              ctx.fill()

              ctx.beginPath()
              ctx.moveTo(c.x - 88, c.y - eyeRy + eyeRy * 2 * droop)
              ctx.lineTo(c.x + 88, c.y - eyeRy + eyeRy * 2 * droop)
              ctx.strokeStyle = 'rgba(28, 31, 102, 0.7)'
              ctx.lineWidth = 8
              ctx.lineCap = 'round'
              ctx.stroke()
            }

            ctx.restore()
          }
        }
      })

      // Resting floating z's
      if (activeMood === 'resting') {
        for (let i = 0; i < 3; i++) {
          const phase = ((now * 0.35 + i / 3) % 1 + 1) % 1
          const fontSize = 24 + i * 8
          const zx = body.x + body.w - 120 + phase * 60 + Math.sin(phase * 6) * 8
          const zy = body.y + 80 - phase * 100
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * Math.sin(Math.PI * phase)})`
          ctx.fillText('z', zx, zy)
        }
      }

      // Thinking floating wobble dots
      if (activeMood === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const wobble = Math.sin(now * 3 + i) * 4
          const dx = body.x + body.w - 100 + i * 24
          const dy = body.y + 36 - i * 12 + wobble
          ctx.beginPath()
          ctx.ellipse(dx, dy, 7, 7, 0, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - i * 0.28})`
          ctx.fill()
        }
      }

      // Mouth / Nose
      const noseW = isRisingSun ? 60 - st.talk * 8 : 56 - st.talk * 8
      const noseH = isRisingSun ? 38 + st.talk * 34 : 36 + st.talk * 32

      if (activeMood === 'happy' && st.talk < 0.1) {
        // Wide joyful smile
        ctx.beginPath()
        ctx.moveTo(noseX - 8, noseY + 8)
        ctx.quadraticCurveTo(noseX + noseW / 2, noseY + 54, noseX + noseW + 8, noseY + 8)
        ctx.closePath()
        ctx.fillStyle = '#1C1F66'
        ctx.fill()
      } else {
        // Cute nose / mouth ellipse
        ctx.beginPath()
        ctx.ellipse(noseX + noseW / 2, noseY + noseH / 2, noseW / 2, noseH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#1C1F66'
        ctx.fill()

        // Tongue when talking
        if (st.talk > 0.22) {
          ctx.beginPath()
          ctx.ellipse(
            noseX + noseW / 2,
            noseY + noseH - noseH * 0.25,
            noseW * 0.28,
            noseH * 0.15,
            0, 0, Math.PI * 2
          )
          ctx.fillStyle = 'rgba(229, 139, 196, 0.92)'
          ctx.fill()
        }
      }

      ctx.restore() // Body transform
      ctx.restore() // Design space

      animFrame = requestAnimationFrame(renderLoop)
    }

    animFrame = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  // Local pointer tracking over canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    // Map mouse position relative to canvas center as -1 to 1
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2.2
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2.2
    animState.current.mouseGaze = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny))
    }
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    animState.current.mouseGaze = null
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    />
  )
}
export default TreyCharacter
