import React, { useEffect, useState, useRef } from 'react'
import { TreyCharacter, TreyMood } from '../components/TreyCharacter'

interface CursorPayload {
  x: number
  y: number
  faceX: number
  faceY: number
  width: number
  height: number
}

interface FocusSyncPayload {
  current?: {
    task: string
    duration: number
    elapsed: number
    status: string
    detail: string
  }
  developerMode: boolean
  formattedTime: string
}

export default function App(): React.JSX.Element {
  const [mood, setMood] = useState<TreyMood>('listening')
  const [talkLevel, setTalkLevel] = useState<number>(0)
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | undefined>(undefined)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const api = (window as unknown as {
      faceAPI?: {
        onCursorMoved: (cb: (payload: CursorPayload) => void) => () => void
        onExpressionChanged: (cb: (expr: string) => void) => () => void
        onSessionSync: (cb: (sync: FocusSyncPayload) => void) => () => void
        moveWindow: (dx: number, dy: number) => Promise<void>
        resizeWindow: (deltaFactor: number) => Promise<unknown>
        resetSize: () => Promise<void>
      }
    }).faceAPI

    if (!api) return

    const unsubCursor = api.onCursorMoved((p) => {
      const centerX = p.faceX + p.width / 2
      const centerY = p.faceY + p.height / 2
      const dx = p.x - centerX
      const dy = p.y - centerY
      const dist = Math.hypot(dx, dy)
      const maxReach = 600
      const factor = dist > 0 ? Math.min(dist / maxReach, 1) : 0

      setGazePoint({
        x: dist > 0 ? (dx / dist) * factor : 0,
        y: dist > 0 ? (dy / dist) * factor : 0
      })
    })

    const unsubExpr = api.onExpressionChanged((expr) => {
      if (expr === 'listening') {
        setMood('listening')
        setTalkLevel(0)
      } else if (expr === 'talking') {
        setMood('talking')
        setTalkLevel(0.7)
      } else if (expr === 'thinking') {
        setMood('thinking')
        setTalkLevel(0)
      } else if (expr === 'happy') {
        setMood('happy')
        setTalkLevel(0)
      } else if (expr === 'sleepy') {
        setMood('sleepy')
        setTalkLevel(0)
      } else if (expr === 'resting') {
        setMood('resting')
        setTalkLevel(0)
      } else if (expr === 'pointing') {
        setMood('pointing')
        setTalkLevel(0)
      } else {
        setMood('listening')
        setTalkLevel(0)
      }
    })

    const unsubSync = api.onSessionSync((sync) => {
      if (sync.current) {
        if (sync.current.status === 'paused') {
          setMood('resting')
        } else if (sync.current.status === 'running') {
          setMood('listening')
        }
      }
    })

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        void api.resizeWindow(1.1)
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        void api.resizeWindow(1 / 1.1)
      } else if (event.key === '0') {
        event.preventDefault()
        void api.resetSize()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubCursor()
      unsubExpr()
      unsubSync()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.screenX, y: e.screenY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!isDragging) return
    const dx = e.screenX - dragStart.current.x
    const dy = e.screenY - dragStart.current.y
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      dragStart.current = { x: e.screenX, y: e.screenY }
      void (window as unknown as { faceAPI?: { moveWindow: (dx: number, dy: number) => Promise<void> } })
        .faceAPI?.moveWindow(dx, dy)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    setIsDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={(event) => {
        if (!event.ctrlKey) return
        event.preventDefault()
        void (window as unknown as { faceAPI?: { resizeWindow: (factor: number) => Promise<unknown> } })
          .faceAPI?.resizeWindow(event.deltaY < 0 ? 1.08 : 1 / 1.08)
      }}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        ...({ WebkitAppRegion: 'drag' } as React.CSSProperties)
      }}
      title="Trey · Drag to move anywhere · Ctrl+Wheel or Ctrl +/- to resize · Ctrl+0 to reset"
    >
      <TreyCharacter
        mode="contained"
        mood={mood}
        talkLevel={talkLevel}
        gazePoint={gazePoint}
        interactive={false}
      />
    </div>
  )
}
