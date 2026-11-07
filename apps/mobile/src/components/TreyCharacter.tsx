/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Direct reuse of Trey's HTML5 Canvas character rendering with 60fps damped harmonic springs,
 * saccadic eye wander, pupil convergence, and reactive expressions.
 */

import React, { useEffect, useRef } from 'react'
import { TreyMood } from '@nomin/protocol'

export type TreyCharacterMode = 'contained' | 'rising-sun'

export interface TreyCharacterProps {
  mood?: TreyMood
  mode?: TreyCharacterMode
  talkLevel?: number
  gazePoint?: { x: number; y: number }
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
    touchGaze: null as { x: number; y: number } | null
  })

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
          sp.hop.velocity += 260
          sp.pupil.velocity += 3
        }
      }

      // Target Gaze computation
      let targetGaze = { x: 0, y: 0 }
      if (st.touchGaze) {
        targetGaze = st.touchGaze
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

      // Canvas Rendering
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      ctx.save()
      const dWidth = 844
      const dHeight = 390
      const scale = Math.min(width / dWidth, height / dHeight) * (propsRef.current.userScale || 1.0)
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

      // Character Blueberry Body
      ctx.beginPath()
      ctx.ellipse(
        body.x + body.width / 2,
        body.y + body.height / 2,
        body.width / 2,
        body.height / 2,
        0,
        0,
        Math.PI * 2
      )
      const bodyGrad = ctx.createRadialGradient(
        body.x + 246,
        body.y + 126,
        0,
        body.x + body.width / 2,
        body.y + body.height / 2,
        body.width / 2
      )
      bodyGrad.addColorStop(0, '#6C86F5')
      bodyGrad.addColorStop(0.65, '#4254D6')
      bodyGrad.addColorStop(1, '#2B2F8F')
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // Specular highlight
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(body.x + 210, body.y + 55, 46, 22, -0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fill()
      ctx.restore()

      // Crown / Blueberry calyx
      ctx.fillStyle = '#1A1D36'
      ctx.beginPath()
      ctx.ellipse(body.x + body.width / 2, body.y - 12 - sp.browLift.value * 0.3, 42, 26, 0, 0, Math.PI * 2)
      ctx.fill()

      // Eyes
      const eyeY = body.y + 157
      const eyeCenters = [
        { x: body.x + 280, y: eyeY },
        { x: body.x + 540, y: eyeY }
      ]

      // Cheeks
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1
        const c = eyeCenters[i]
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(c.x - 45 + side * 62, c.y + 96, 45, 21, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(243, 166, 216, ${0.25 + 0.45 * sp.blush.value})`
        ctx.fill()
        ctx.restore()
      }

      // Eyeballs & Pupils
      const open = Math.max(0.06, 1 - closed) * (1 - st.talk * 0.12)
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1
        const c = eyeCenters[i]

        // Eyebrows
        ctx.save()
        const browY = c.y - 112 - Math.min(18, Math.max(-10, sp.browLift.value)) * 0.7
        ctx.translate(c.x + side * 6, browY)
        ctx.rotate(sp.browTilt.value * side * -1 + (activeMood === 'thinking' && i === 1 ? -0.25 : 0))
        ctx.beginPath()
        ctx.moveTo(-38, 6)
        ctx.quadraticCurveTo(0, -12, 38, 6)
        ctx.strokeStyle = '#1A1D36'
        ctx.lineWidth = 14
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()

        if (activeMood === 'resting') {
          ctx.beginPath()
          ctx.moveTo(c.x - 62, c.y + 6)
          ctx.quadraticCurveTo(c.x, c.y + 52, c.x + 62, c.y + 6)
          ctx.strokeStyle = '#0B0D1B'
          ctx.lineWidth = 18
          ctx.lineCap = 'round'
          ctx.stroke()
          continue
        }

        if (activeMood === 'happy' && sp.squint.value > 0.6) {
          ctx.beginPath()
          ctx.moveTo(c.x - 60, c.y + 34)
          ctx.quadraticCurveTo(c.x, c.y - 54, c.x + 60, c.y + 34)
          ctx.strokeStyle = '#0B0D1B'
          ctx.lineWidth = 24
          ctx.lineCap = 'round'
          ctx.stroke()
          continue
        }

        // Sclera (White)
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, 95, 95 * open, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.clip()

        if (open > 0.2) {
          const reach = 50
          const r = 46 * sp.pupil.value
          const px = c.x + sp.gazeX.value * reach - side * 3
          let py = c.y + sp.gazeY.value * reach * open
          if (activeMood === 'sleepy') py = Math.max(py, c.y) + 28

          // Dark pupil
          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.fillStyle = '#0B0D1B'
          ctx.fill()

          // Catchlights
          ctx.beginPath()
          ctx.arc(px - r * 0.58, py - r * 0.72, r * 0.28, 0, Math.PI * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()

          ctx.beginPath()
          ctx.arc(px + r * 0.28, py + r * 0.22, r * 0.12, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.fill()
        }
        ctx.restore()
      }

      // Mouth
      const noseW = 60 - st.talk * 8
      const noseH = 38 + st.talk * 34
      const noseY = body.y + 272 - st.talk * 6
      const noseX = body.x + body.width / 2

      ctx.save()
      if (activeMood === 'happy' && st.talk < 0.1) {
        ctx.beginPath()
        ctx.moveTo(noseX - noseW / 2 - 8, noseY + 8)
        ctx.quadraticCurveTo(noseX, noseY + 58, noseX + noseW / 2 + 8, noseY + 8)
        ctx.fillStyle = '#1A1D36'
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.ellipse(noseX, noseY, noseW / 2, noseH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#1A1D36'
        ctx.fill()
        if (st.talk > 0.25) {
          ctx.beginPath()
          ctx.ellipse(noseX, noseY + noseH * 0.18, noseW * 0.28, noseH * 0.18, 0, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(229, 139, 196, 0.95)'
          ctx.fill()
        }
      }
      ctx.restore()

      ctx.restore()
      animFrame = requestAnimationFrame(renderLoop)
    }

    animFrame = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  // Touch and Mouse tracking pulls Trey's gaze
  const handleTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    const touch = e.touches[0]
    if (!touch || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((touch.clientY - rect.top) / rect.height) * 2 - 1
    animState.current.touchGaze = { x, y }
  }

  const handleTouchEnd = () => {
    animState.current.touchGaze = null
  }

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...style
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={844}
        height={mode === 'rising-sun' ? 390 : 560}
        onTouchMove={handleTouch}
        onTouchStart={handleTouch}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  )
}
