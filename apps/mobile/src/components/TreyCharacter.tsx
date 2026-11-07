/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Full-Screen High-Fidelity Trey Character for Mobile Companion & Standalone.
 * Faithful port of Riley Brown's Bluey iOS FaceView & BlobShape:
 * - Damped harmonic springs for gaze, brows, blinks, lean, and hops
 * - Full-screen responsive viewport canvas (OLED pure black)
 * - Organic squircle body geometry with cubic bezier curves
 * - 4-stop blueberry gradient with radial specular shine and crown
 * - Saccadic wander, double-blinking, and live touch tracking
 */

import React, { useEffect, useRef } from 'react'
import { TreyMood } from '@nomin/protocol'

export interface TreyCharacterProps {
  mood?: TreyMood
  talkLevel?: number
  gazePoint?: { x: number; y: number }
  touchPoint?: { x: number; y: number } | null
  className?: string
  style?: React.CSSProperties
  interactive?: boolean
  userScale?: number
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
  talkLevel = 0,
  gazePoint,
  touchPoint,
  className,
  style,
  interactive = true,
  userScale = 1.0
}) => {
  void interactive
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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
    nextHop: performance.now() / 1000 + 8.0
  })

  const propsRef = useRef({ mood, talkLevel, gazePoint, touchPoint, userScale })
  useEffect(() => {
    propsRef.current = { mood, talkLevel, gazePoint, touchPoint, userScale }
  }, [mood, talkLevel, gazePoint, touchPoint, userScale])

  useEffect(() => {
    let animFrame: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleResize = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    handleResize()
    window.addEventListener('resize', handleResize)

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
          sp.hop.velocity += 260
          sp.pupil.velocity += 3
        }
      }

      // Compute target gaze coordinates (-1..1)
      let targetGaze = { x: 0, y: 0 }
      if (propsRef.current.touchPoint) {
        targetGaze = propsRef.current.touchPoint
      } else if (propsRef.current.gazePoint) {
        targetGaze = propsRef.current.gazePoint
      } else {
        if (now > st.nextSaccade) {
          st.wanderTarget = {
            x: (Math.random() - 0.5) * 1.6,
            y: (Math.random() - 0.5) * 0.8 - 0.2
          }
          st.nextSaccade = now + 1.2 + Math.random() * 2.0
        }
        targetGaze = st.wanderTarget
      }

      if (activeMood === 'thinking') {
        targetGaze = { x: 0.6 + 0.08 * Math.sin(now * 1.3), y: -0.85 }
      }

      if (now > st.nextJitter) {
        const amt = activeMood === 'talking' ? 0.07 : activeMood === 'thinking' ? 0.05 : 0.02
        st.jitter = {
          x: (Math.random() - 0.5) * amt * 2,
          y: (Math.random() - 0.5) * amt * 2
        }
        st.nextJitter = now + 0.5 + Math.random() * 0.9
      }

      sp.gazeX.step(targetGaze.x + st.jitter.x, dt)
      sp.gazeY.step(targetGaze.y + st.jitter.y, dt)

      let wantTalk = propsRef.current.talkLevel || 0
      if (activeMood === 'talking' && wantTalk === 0) {
        wantTalk = 0.5 + 0.5 * Math.sin(now * 19) * Math.sin(now * 7.3)
      }
      st.talk += (wantTalk - st.talk) * Math.min(1, dt * 25)

      // Expression parameters
      let wantPupil = 1.0, wantLift = 0.0, wantTilt = 0.0, wantBlush = 0.25, wantSquint = 0.0
      switch (activeMood) {
        case 'listening':
          wantPupil = 1.12; wantLift = 10; break
        case 'talking':
          wantPupil = 1.05; wantLift = 6 + st.talk * 18; wantTilt = 0.05 * Math.sin(now * 2.3); break
        case 'pointing':
          wantPupil = 0.95; wantLift = -4; wantTilt = -0.14; break
        case 'thinking':
          wantPupil = 0.90; wantLift = 4; wantTilt = 0.22; break
        case 'happy':
          wantPupil = 1.20; wantLift = 16; wantBlush = 0.85; wantSquint = 1.0; break
        case 'resting':
          wantPupil = 0.90; wantLift = -8; wantBlush = 0.15; break
        case 'sleepy':
          wantPupil = 0.88; wantLift = -10; wantTilt = 0.12; wantBlush = 0.15; break
      }

      sp.pupil.step(wantPupil, dt)
      sp.browLift.step(wantLift, dt)
      sp.browTilt.step(wantTilt, dt)
      sp.blush.step(wantBlush, dt)
      sp.squint.step(wantSquint, dt)
      sp.lean.step(-sp.gazeX.value * 0.045, dt)

      if (now > st.nextHop) {
        if (st.talk < 0.05 && activeMood !== 'sleepy' && activeMood !== 'resting') {
          sp.hop.velocity += 180 + Math.random() * 140
        }
        st.nextHop = now + 7.0 + Math.random() * 7.0
      }
      sp.hop.step(0, dt)

      const drowsy = activeMood === 'sleepy'
      if (now > st.nextBlink) {
        st.blinkStart = now
        st.doubleBlink = !drowsy && Math.random() < 0.25
        st.nextBlink = now + (drowsy ? 1.6 + Math.random() * 1.4 : 2.0 + Math.random() * 3.0)
      }
      const bp = (now - st.blinkStart) / (drowsy ? 0.7 : 0.15)
      let closed = bp >= 0 && bp <= 1 ? Math.sin(Math.PI * bp) : 0
      if (st.doubleBlink && bp >= 1.3 && bp <= 2.3) {
        closed = Math.sin(Math.PI * (bp - 1.3))
      }

      const breathe = Math.sin(now * (activeMood === 'resting' ? 1.1 : 1.8))

      // Canvas dimensions
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      ctx.save()
      const dWidth = 844
      const dHeight = 390
      // In mobile full-screen mode, use max scaling so the character fills the phone screen
      const scale = Math.max(width / dWidth, height / dHeight) * (propsRef.current.userScale || 1.0)
      ctx.translate((width - dWidth * scale) / 2, height - dHeight * scale)
      ctx.scale(scale, scale)

      const bounce = -st.talk * 16 + breathe * 3 - sp.hop.value
      const body = { x: 12, y: 44 + bounce, width: 820, height: 700 }
      const pivot = { x: body.x + body.width / 2, y: body.y + body.height }

      ctx.translate(pivot.x, pivot.y)
      ctx.rotate(sp.lean.value)
      const stretch = 1 + Math.min(0.03, Math.max(-0.03, sp.hop.value / 900))
      ctx.scale(2 - stretch, stretch)
      ctx.translate(-pivot.x, -pivot.y)

      // Draw Organic Bluey/Trey Squircle Shape:
      // border-radius: 52% 48% 46% 54% / 58% 56% 44% 42%
      const bw = body.width, bh = body.height
      const tl = { w: 0.52 * bw, h: 0.58 * bh }
      const tr = { w: 0.48 * bw, h: 0.56 * bh }
      const br = { w: 0.46 * bw, h: 0.44 * bh }
      const bl = { w: 0.54 * bw, h: 0.42 * bh }
      const k = 0.5523

      ctx.beginPath()
      ctx.moveTo(body.x + tl.w, body.y)
      ctx.lineTo(body.x + bw - tr.w, body.y)
      ctx.bezierCurveTo(
        body.x + bw - tr.w * (1 - k), body.y,
        body.x + bw, body.y + tr.h * (1 - k),
        body.x + bw, body.y + tr.h
      )
      ctx.lineTo(body.x + bw, body.y + bh - br.h)
      ctx.bezierCurveTo(
        body.x + bw, body.y + bh - br.h * (1 - k),
        body.x + bw - br.w * (1 - k), body.y + bh,
        body.x + bw - br.w, body.y + bh
      )
      ctx.lineTo(body.x + bl.w, body.y + bh)
      ctx.bezierCurveTo(
        body.x + bl.w * (1 - k), body.y + bh,
        body.x, body.y + bh - bl.h * (1 - k),
        body.x, body.y + bh - bl.h
      )
      ctx.lineTo(body.x, body.y + tl.h)
      ctx.bezierCurveTo(
        body.x, body.y + tl.h * (1 - k),
        body.x + tl.w * (1 - k), body.y,
        body.x + tl.w, body.y
      )
      ctx.closePath()

      // 4-stop 150° blueberry gradient: #A9BCFF, #6C86F5, #4254D6, #2B2F8F
      const grad = ctx.createLinearGradient(
        body.x + 0.25 * bw,
        body.y + 0.067 * bh,
        body.x + 0.75 * bw,
        body.y + 0.933 * bh
      )
      grad.addColorStop(0, '#A9BCFF')
      grad.addColorStop(0.34, '#6C86F5')
      grad.addColorStop(0.68, '#4254D6')
      grad.addColorStop(1.0, '#2B2F8F')

      ctx.fillStyle = grad
      ctx.fill()

      // Specular soft shine overlay
      ctx.save()
      ctx.clip()
      const shineGrad = ctx.createRadialGradient(
        body.x + 246,
        body.y + 126,
        0,
        body.x + 246,
        body.y + 126,
        243
      )
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shineGrad
      ctx.fillRect(body.x, body.y, bw, bh)

      // Glossy sparkle on forehead
      ctx.beginPath()
      ctx.ellipse(body.x + 190, body.y + 40, 23, 11, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fill()
      ctx.restore()

      // 10-point Blueberry Crown on head
      const crownBox = { x: body.x + 368, y: body.y - 20 - sp.browLift.value * 0.3, w: 84, h: 56 }
      const crownPts = [
        [30, 4], [36, 16], [52, 12], [40, 24], [46, 36],
        [30, 28], [14, 36], [20, 24], [8, 12], [24, 16]
      ]
      ctx.beginPath()
      crownPts.forEach(([px, py], i) => {
        const cx = crownBox.x + (px / 60) * crownBox.w
        const cy = crownBox.y + (py / 40) * crownBox.h
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      })
      ctx.closePath()
      ctx.fillStyle = '#1C1F66'
      ctx.fill()

      // Blushy Cheeks
      const eyeY = body.y + 157
      const eyeCenters = [
        { x: body.x + 280, y: eyeY },
        { x: body.x + 540, y: eyeY }
      ]

      eyeCenters.forEach((c, i) => {
        const side = i === 0 ? -1 : 1
        ctx.beginPath()
        ctx.ellipse(c.x + side * 62, c.y + 96, 45, 21, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(243, 166, 216, ${0.25 + 0.45 * sp.blush.value})`
        ctx.fill()
      })

      // Eyebrows & Eyes
      const squash = 1 - st.talk * 0.12
      eyeCenters.forEach((c, i) => {
        const side = i === 0 ? -1 : 1

        // Eyebrow arch
        ctx.save()
        const browY = c.y - 112 - Math.min(18, Math.max(-10, sp.browLift.value)) * 0.7
        ctx.translate(c.x + side * 6, browY)
        const tilt = sp.browTilt.value * -side + (activeMood === 'thinking' && i === 1 ? -0.25 : 0)
        ctx.rotate(tilt)
        ctx.beginPath()
        ctx.moveTo(-38, 6)
        ctx.quadraticCurveTo(0, -12, 38, 6)
        ctx.lineWidth = 14
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#1C1F66'
        ctx.stroke()
        ctx.restore()

        // Eye state rendering
        if (activeMood === 'resting') {
          // Closed peaceful curved eyes
          ctx.beginPath()
          ctx.moveTo(c.x - 62, c.y + 6)
          ctx.quadraticCurveTo(c.x, c.y + 52, c.x + 62, c.y + 6)
          ctx.lineWidth = 18
          ctx.lineCap = 'round'
          ctx.strokeStyle = '#17151F'
          ctx.stroke()
        } else if (activeMood === 'happy' && sp.squint.value > 0.6) {
          // Happy upward laughing eye curves
          ctx.beginPath()
          ctx.moveTo(c.x - 60, c.y + 34)
          ctx.quadraticCurveTo(c.x, c.y - 54, c.x + 60, c.y + 34)
          ctx.lineWidth = 24
          ctx.lineCap = 'round'
          ctx.strokeStyle = '#17151F'
          ctx.stroke()
        } else {
          // Open glossy eyes with moving pupils & catchlights
          const open = Math.max(0.06, 1 - closed) * squash
          const ew = 95
          const eh = 95 * open

          ctx.beginPath()
          ctx.ellipse(c.x, c.y, ew, eh, 0, 0, Math.PI * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()

          if (open > 0.2) {
            ctx.save()
            ctx.beginPath()
            ctx.ellipse(c.x, c.y, ew, eh, 0, 0, Math.PI * 2)
            ctx.clip()

            let gx = sp.gazeX.value
            let gy = sp.gazeY.value
            const len = Math.hypot(gx, gy)
            if (len > 1) {
              gx /= len
              gy /= len
            }

            const reach = 50
            const pr = 46 * sp.pupil.value
            const px = c.x + gx * reach - side * 3
            let py = c.y + gy * reach * open
            if (activeMood === 'sleepy') {
              py = Math.max(py, c.y) + 28
            }

            // Pupil
            ctx.beginPath()
            ctx.ellipse(px, py, pr, pr, 0, 0, Math.PI * 2)
            ctx.fillStyle = '#17151F'
            ctx.fill()

            // Primary Catchlight
            ctx.beginPath()
            ctx.ellipse(px - pr * 0.38, py - pr * 0.44, pr * 0.28, pr * 0.28, 0, 0, Math.PI * 2)
            ctx.fillStyle = '#FFFFFF'
            ctx.fill()

            // Secondary Catchlight
            ctx.beginPath()
            ctx.ellipse(px + pr * 0.28, py + pr * 0.22, pr * 0.12, pr * 0.12, 0, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
            ctx.fill()

            ctx.restore()
          }
        }
      })

      // Thinking animation dots
      if (activeMood === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const wobble = Math.sin(now * 3 + i) * 4
          const dx = body.x + 690 + i * 26
          const dy = body.y + 40 - i * 12 + wobble
          ctx.beginPath()
          ctx.arc(dx, dy, 8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - i * 0.3})`
          ctx.fill()
        }
      }

      // Mouth & Nose
      const noseW = 60 - st.talk * 8
      const noseH = 38 + st.talk * 34
      const noseX = body.x + 410 - noseW / 2
      const noseY = body.y + 272 - st.talk * 6

      if (activeMood === 'happy' && st.talk < 0.1) {
        ctx.beginPath()
        ctx.moveTo(noseX - 8, noseY + 8)
        ctx.quadraticCurveTo(noseX + noseW / 2, noseY + 58, noseX + noseW + 8, noseY + 8)
        ctx.closePath()
        ctx.fillStyle = '#1C1F66'
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.ellipse(noseX + noseW / 2, noseY + noseH / 2, noseW / 2, noseH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#1C1F66'
        ctx.fill()

        if (st.talk > 0.25) {
          ctx.beginPath()
          ctx.ellipse(
            noseX + noseW / 2,
            noseY + noseH - (noseH * 0.3) / 2,
            noseW * 0.28,
            noseH * 0.15,
            0,
            0,
            Math.PI * 2
          )
          ctx.fillStyle = 'rgba(229, 139, 196, 0.9)'
          ctx.fill()
        }
      }

      ctx.restore()
      animFrame = requestAnimationFrame(renderLoop)
    }

    animFrame = requestAnimationFrame(renderLoop)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrame)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        ...style
      }}
    />
  )
}
