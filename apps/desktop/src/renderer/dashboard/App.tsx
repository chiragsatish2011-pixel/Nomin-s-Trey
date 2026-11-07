import React, { useEffect, useState, useMemo } from 'react'
import { TreyCharacter, TreyMood } from '../components/TreyCharacter'
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  MicIcon,
  PinIcon,
  HistoryIcon,
  SettingsIcon,
  CloseIcon,
  ScannerIcon,
  PipIcon,
  KeyIcon,
  AlertIcon,
  SmartphoneIcon
} from '../components/Icons'
import { PairingSheet } from './PairingSheet'

interface CheckItem {
  id: string
  elapsed: number
  activity: string
  probability: number
  probabilities?: {
    on_task?: number
    off_task?: number
    uncertain?: number
  }
  confidence: number
  sampleDuration?: number
  nudged?: boolean
}

interface FocusSessionState {
  id: string
  task: string
  duration: number
  elapsed: number
  realElapsed?: number
  status: 'running' | 'paused' | 'ended'
  detail: string
  usedDeveloperMode?: boolean
  developerMode?: boolean
  checks: CheckItem[]
}

interface SessionSyncData {
  current?: FocusSessionState
  developerMode: boolean
  formattedTime: string
  hasApiKey?: boolean
  maskedKey?: string | null
  activeModel?: string
  governor?: {
    state: 'ok' | 'cooling_down' | 'circuit_open'
    secondsLeft?: number
    callsToday: number
    callsThisSession: number
  }
}

interface HistoryRecord {
  id: string
  task: string
  startedAt: number
  endedAt: number
  duration: number
  elapsed: number
  realElapsed: number
  usedDeveloperMode: boolean
  checks: CheckItem[]
}

interface AppSettings {
  developerMode: boolean
  expression: string
  provider?: 'nim' | 'openai' | 'custom'
  baseUrl?: string
  model: string
  fallbackModels: string[]
  checkIntervalSec: number
  rpmLimit: number
  maxCheckLatencySec: number
  monitorChoice: 'primary' | 'all'
  hotkeyPause: string
  hotkeyVoice: string
  autoStartOnLogin?: boolean
  startMinimizedToTray?: boolean
}

interface PerceptionDebugData {
  imageDataUrl: string
  lines: { id: string; text: string; rect: { x: number; y: number; width: number; height: number } }[]
  app: { processName: string; windowTitle: string }
  idleSeconds: number
}

export interface DashboardAPIClient {
  onSync: (callback: (state: unknown) => void) => () => void
  onCursorMoved: (callback: (payload: { x: number; y: number; faceX: number; faceY: number; width?: number; height?: number }) => void) => () => void
  onExpressionChanged: (callback: (expression: string) => void) => () => void
  startFocus: (task: string, minutes: number) => Promise<string>
  pauseFocus: () => Promise<string>
  resumeFocus: () => Promise<string>
  endFocus: () => Promise<string>
  setDeveloperMode: (enabled: boolean) => Promise<string>
  testNudge: () => Promise<string>
  getHistory: () => Promise<unknown[]>
  clearHistory: () => Promise<void>
  captureNow: () => Promise<PerceptionDebugData>
  saveApiKey: (key: string) => Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }>
  hasApiKey: () => Promise<boolean>
  getKeyMasked: () => Promise<string | null>
  testApiKey: (key?: string) => Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }>
  removeApiKey: () => Promise<boolean>
  listModels: () => Promise<string[]>
  getGovernorStatus: () => Promise<unknown>
  getSettings: () => Promise<unknown>
  saveSettings: (settings: unknown) => Promise<void>
  setAlwaysOnTop: (pinned: boolean) => Promise<boolean>
  isAlwaysOnTop: () => Promise<boolean>
  toggleFloatingBuddy: (show: boolean) => Promise<boolean>
  isFloatingBuddyVisible: () => Promise<boolean>
  queryResearch: (question: string) => Promise<unknown>
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  startTakeover: (task: string) => Promise<{ success: boolean; summary: string }>
  stopTakeover: () => Promise<void>
  isTakeoverActive: () => Promise<boolean>
}

// Apple-style Interactive Focus Timeline Component
function TimelineBar({
  checks,
  onSelectCheck
}: {
  checks: CheckItem[]
  onSelectCheck: (c: CheckItem) => void
}): React.JSX.Element {
  const validChecks = useMemo(() => checks.filter((c) => c.activity !== 'paused'), [checks])

  if (validChecks.length === 0) {
    return (
      <div
        style={{
          height: 28,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 980,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.4)',
          letterSpacing: '-0.2px'
        }}
      >
        No screen checks recorded yet
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        height: 28,
        padding: '3px 4px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 980,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}
    >
      {validChecks.map((c) => {
        let bg = '#34C759' // Apple Emerald on-task
        let border = 'rgba(52, 199, 89, 0.4)'
        if (c.nudged || c.probability < 0.35) {
          bg = '#FF9500' // Apple Amber off-task / nudge
          border = 'rgba(255, 149, 0, 0.5)'
        } else if (c.probability < 0.65) {
          bg = '#6C86F5' // Lavender/Blueberry uncertain
          border = 'rgba(108, 134, 245, 0.5)'
        }

        return (
          <button
            key={c.id}
            onClick={() => onSelectCheck(c)}
            title={`${Math.round(c.elapsed / 60)}m · ${c.activity} (${Math.round(c.probability * 100)}%)`}
            style={{
              flex: 1,
              minWidth: 8,
              maxWidth: 24,
              height: '100%',
              borderRadius: 6,
              background: bg,
              border: `1px solid ${border}`,
              cursor: 'pointer',
              transition: 'transform 0.12s ease-out, filter 0.12s ease-out',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scaleY(1.2)'
              e.currentTarget.style.filter = 'brightness(1.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scaleY(1)'
              e.currentTarget.style.filter = 'none'
            }}
          />
        )
      })}
    </div>
  )
}

export default function App(): React.JSX.Element {
  // Session & state
  const [session, setSession] = useState<FocusSessionState | null>(null)
  const [developerMode, setDeveloperMode] = useState<boolean>(false)
  const [formattedTime, setFormattedTime] = useState<string>('30:00')
  const [taskInput, setTaskInput] = useState<string>('')
  const [durationInput, setDurationInput] = useState<number>(30)
  const [takeoverRunning, setTakeoverRunning] = useState<boolean>(false)
  const [takeoverStatusMsg, setTakeoverStatusMsg] = useState<string>('')

  // Character & Mood
  const [characterMood, setCharacterMood] = useState<TreyMood>('listening')
  const [talkLevel, setTalkLevel] = useState<number>(0)
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | undefined>(undefined)

  // Sheets & Popovers
  const [activeSheet, setActiveSheet] = useState<'none' | 'history' | 'settings' | 'pairing'>('none')
  const [selectedCheck, setSelectedCheck] = useState<CheckItem | null>(null)
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])

  // Settings & Debugger
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState<string>('')
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState<boolean>(false)
  const [testFeedback, setTestFeedback] = useState<{
    type: 'success' | 'error' | 'idle'
    message: string
  }>({ type: 'idle', message: '' })
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false)
  const [showKeyText, setShowKeyText] = useState<boolean>(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [perceptionDebug, setPerceptionDebug] = useState<PerceptionDebugData | null>(null)
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [isPinned, setIsPinned] = useState<boolean>(true)
  const [isFloatingBuddyOn, setIsFloatingBuddyOn] = useState<boolean>(false)
  const [nudgeBanner, setNudgeBanner] = useState<string | null>(null)
  const [researchQuery, setResearchQuery] = useState<string>('')
  const [isResearching, setIsResearching] = useState<boolean>(false)

  const dashboardAPI = useMemo(() => {
    return (window as unknown as { dashboardAPI: DashboardAPIClient }).dashboardAPI
  }, [])

  // Sync with coordinator
  useEffect(() => {
    if (!dashboardAPI) return

    const unsubSync = dashboardAPI.onSync((rawState: unknown) => {
      const data = rawState as SessionSyncData
      if (data.current) {
        setSession(data.current)
        setFormattedTime(data.formattedTime)

        // Map session state to character mood
        if (data.current.status === 'paused') {
          setCharacterMood('resting')
        } else if (data.current.status === 'running') {
          const lastCheck = data.current.checks[data.current.checks.length - 1]
          if (lastCheck && lastCheck.nudged) {
            setCharacterMood('pointing')
            setNudgeBanner(data.current.detail || `Distraction detected. Time to get back to "${data.current.task}".`)
          } else if (lastCheck && lastCheck.probability >= 0.7) {
            setCharacterMood('happy')
          } else {
            setCharacterMood('listening')
          }
        }
      } else {
        setSession(null)
        setFormattedTime('30:00')
        setCharacterMood('listening')
      }
      setDeveloperMode(data.developerMode)
      if (typeof data.hasApiKey === 'boolean') {
        setHasApiKey(data.hasApiKey)
      }
      if (data.maskedKey !== undefined) {
        setMaskedKey(data.maskedKey)
      }
    })

    const unsubCursor = dashboardAPI.onCursorMoved((p: { x: number; y: number; faceX: number; faceY: number; width?: number; height?: number }) => {
      // Map cursor coordinates to -1 ... 1 gaze relative to window
      if (p.width && p.height) {
        const localX = p.x - p.faceX
        const localY = p.y - p.faceY
        const nx = ((localX / p.width) - 0.5) * 2.2
        const ny = ((localY / p.height) - 0.5) * 2.2
        setGazePoint({
          x: Math.max(-1, Math.min(1, nx)),
          y: Math.max(-1, Math.min(1, ny))
        })
      }
    })

    const unsubExpr = dashboardAPI.onExpressionChanged((expr: string) => {
      if (expr === 'listening') setCharacterMood('listening')
      else if (expr === 'talking') {
        setCharacterMood('talking')
        setTalkLevel(0.6)
      } else if (expr === 'thinking') setCharacterMood('thinking')
      else if (expr === 'happy') setCharacterMood('happy')
      else if (expr === 'sleepy') setCharacterMood('sleepy')
      else if (expr === 'resting') setCharacterMood('resting')
      else if (expr === 'idle') {
        setCharacterMood('listening')
        setTalkLevel(0)
      }
    })

    // Initial query
    dashboardAPI.hasApiKey().then(setHasApiKey).catch(() => {})
    dashboardAPI.getKeyMasked().then(setMaskedKey).catch(() => {})
    dashboardAPI.listModels().then(setAvailableModels).catch(() => {})
    dashboardAPI.getSettings().then((s: unknown) => setSettings(s as AppSettings)).catch(() => {})
    dashboardAPI.isAlwaysOnTop().then(setIsPinned).catch(() => {})
    dashboardAPI.isFloatingBuddyVisible().then(setIsFloatingBuddyOn).catch(() => {})

    return () => {
      unsubSync()
      unsubCursor()
      unsubExpr()
    }
  }, [dashboardAPI])

  // Load history when opening history sheet
  useEffect(() => {
    if (activeSheet === 'history' && dashboardAPI) {
      dashboardAPI.getHistory().then((data: unknown) => {
        setHistoryList(data as HistoryRecord[])
      }).catch(() => {})
    }
  }, [activeSheet, dashboardAPI])

  // Actions
  const handleStartTakeover = async () => {
    if (!taskInput.trim()) return
    setTakeoverRunning(true)
    setTakeoverStatusMsg('Trey is taking control of the PC…')
    try {
      const res = await dashboardAPI.startTakeover(taskInput.trim())
      setTakeoverStatusMsg(res.summary)
    } catch (err) {
      setTakeoverStatusMsg(`Takeover error: ${String(err)}`)
    } finally {
      setTakeoverRunning(false)
    }
  }

  const handleStopTakeover = async () => {
    await dashboardAPI.stopTakeover()
    setTakeoverRunning(false)
    setTakeoverStatusMsg('Takeover stopped by user.')
  }

  const handleStart = async () => {
    if (!taskInput.trim()) return
    await dashboardAPI.startFocus(taskInput.trim(), durationInput)
    setNudgeBanner(null)
  }

  const handlePause = async () => {
    await dashboardAPI.pauseFocus()
  }

  const handleResume = async () => {
    await dashboardAPI.resumeFocus()
  }

  const handleEnd = async () => {
    await dashboardAPI.endFocus()
    setNudgeBanner(null)
  }

  const handleTestNudge = async () => {
    setCharacterMood('pointing')
    await dashboardAPI.testNudge()
  }

  const handleTogglePin = async () => {
    const next = !isPinned
    setIsPinned(next)
    await dashboardAPI.setAlwaysOnTop(next)
  }

  const handleToggleFloatingBuddy = async () => {
    const next = !isFloatingBuddyOn
    setIsFloatingBuddyOn(next)
    await dashboardAPI.toggleFloatingBuddy(next)
  }

  const handleTestConnection = async (candidateKey?: string) => {
    if (!dashboardAPI) return
    setTestingConnection(true)
    setTestFeedback({ type: 'idle', message: 'Pinging NVIDIA NIM API (https://integrate.api.nvidia.com/v1)...' })
    try {
      const res = await dashboardAPI.testApiKey(candidateKey)
      if (res.success) {
        setTestFeedback({
          type: 'success',
          message: `Connected! Latency: ${res.latencyMs}ms • ${res.modelCount ?? 0} NIM models online`
        })
      } else {
        setTestFeedback({
          type: 'error',
          message: res.error || 'Connection failed'
        })
      }
    } catch (err: unknown) {
      setTestFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reach NVIDIA NIM'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim() || !dashboardAPI) return
    setIsSavingKey(true)
    setTestFeedback({ type: 'idle', message: 'Testing & encrypting key with Windows DPAPI...' })
    try {
      const res = await dashboardAPI.saveApiKey(apiKeyInput.trim())
      if (res.success) {
        setHasApiKey(true)
        setApiKeyInput('')
        const masked = await dashboardAPI.getKeyMasked()
        setMaskedKey(masked)
        setTestFeedback({
          type: 'success',
          message: `Key verified with NVIDIA & encrypted in Windows DPAPI! Latency: ${res.latencyMs}ms`
        })
      } else {
        setTestFeedback({
          type: 'error',
          message: res.error || 'Invalid key. Please verify key from build.nvidia.com'
        })
      }
    } catch (err: unknown) {
      setTestFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed'
      })
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleRemoveApiKey = async () => {
    if (!dashboardAPI) return
    if (!window.confirm('Remove saved NVIDIA NIM API key from Windows DPAPI storage?')) return
    await dashboardAPI.removeApiKey()
    setHasApiKey(false)
    setMaskedKey(null)
    setTestFeedback({ type: 'idle', message: 'API key removed.' })
  }

  const handleResearch = async () => {
    if (!researchQuery.trim() || !dashboardAPI) return
    setIsResearching(true)
    setCharacterMood('thinking')
    try {
      await dashboardAPI.queryResearch(researchQuery.trim())
      setResearchQuery('')
    } finally {
      setIsResearching(false)
    }
  }

  const handleToggleDevMode = async () => {
    const next = !developerMode
    setDeveloperMode(next)
    await dashboardAPI.setDeveloperMode(next)
  }

  const handleCapturePerception = async () => {
    setIsCapturing(true)
    try {
      const data = await dashboardAPI.captureNow()
      setPerceptionDebug(data)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleClearHistory = async () => {
    await dashboardAPI.clearHistory()
    setHistoryList([])
  }

  // Active status color
  const statusBadge = useMemo(() => {
    if (!session || session.status === 'ended') {
      return { text: 'Ready for mission', color: '#6C86F5', dot: '#6C86F5' }
    }
    if (session.status === 'paused') {
      return { text: 'Emergency Paused (Ctrl+2)', color: '#FF9500', dot: '#FF9500' }
    }
    const lastCheck = session.checks[session.checks.length - 1]
    if (lastCheck && lastCheck.nudged) {
      return { text: 'Drift detected · Refocusing', color: '#FF9500', dot: '#FF9500' }
    }
    if (lastCheck && lastCheck.probability >= 0.7) {
      return { text: 'Active · On track', color: '#34C759', dot: '#34C759' }
    }
    return { text: 'Active · Monitoring', color: '#A9BCFF', dot: '#A9BCFF' }
  }, [session])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", sans-serif',
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. APPLE TOP CONTROL BAR */}
      <header
        style={{
          height: 52,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 40
        }}
      >
        {/* Brand & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: statusBadge.dot,
                boxShadow: `0 0 10px ${statusBadge.dot}`
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
              Trey
            </span>
          </div>

          <div
            style={{
              padding: '3px 10px',
              borderRadius: 980,
              background: 'rgba(255, 255, 255, 0.07)',
              fontSize: 11,
              fontWeight: 500,
              color: statusBadge.color,
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {statusBadge.text}
          </div>

          {developerMode && (
            <div
              style={{
                padding: '3px 10px',
                borderRadius: 980,
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#fca5a5',
                fontSize: 10,
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              Developer Mode (4x Clock · 10s checks)
            </div>
          )}

          {/* NVIDIA NIM Visual Integration Status Indicator */}
          {hasApiKey ? (
            <button
              onClick={() => setActiveSheet('settings')}
              title={`NVIDIA NIM Vision AI is active.\nKey: ${maskedKey || 'Encrypted via DPAPI'}\nModel: ${settings?.model || 'meta/llama-3.2-11b-vision-instruct'}\nClick to test or configure.`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px',
                borderRadius: 980,
                background: 'rgba(52, 199, 89, 0.14)',
                border: '1px solid rgba(52, 199, 89, 0.35)',
                color: '#34C759',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 0 10px rgba(52, 199, 89, 0.12)'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#34C759',
                  boxShadow: '0 0 6px #34C759',
                  display: 'inline-block'
                }}
              />
              <span>NIM Active</span>
              <span style={{ color: 'rgba(52, 199, 89, 0.5)', fontSize: 9 }}>•</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontFamily: 'monospace' }}>
                {(settings?.model || 'llama-3.2-11b').split('/').pop()?.slice(0, 14)}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveSheet('settings')}
              title="NVIDIA NIM API key is required for live AI vision checks. Click to add key."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px',
                borderRadius: 980,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#F59E0B',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#F59E0B',
                  boxShadow: '0 0 6px #F59E0B',
                  display: 'inline-block'
                }}
              />
              <span>NIM Key Missing</span>
              <span style={{ fontSize: 10, textDecoration: 'underline', color: '#FCD34D' }}>Add Key →</span>
            </button>
          )}
        </div>

        {/* Right Frosted Action Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Lock Window on Top */}
          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Window is locked above all apps' : 'Lock window on top of all apps'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 980,
              background: isPinned ? 'rgba(108, 134, 245, 0.22)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isPinned ? '#6C86F5' : 'rgba(255, 255, 255, 0.1)'}`,
              color: isPinned ? '#A9BCFF' : 'rgba(255, 255, 255, 0.75)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            <PinIcon size={14} pinned={isPinned} color={isPinned ? '#A9BCFF' : 'currentColor'} />
            <span>{isPinned ? 'Pinned' : 'Pin to Top'}</span>
          </button>

          {/* Mini Floating Buddy Toggle */}
          <button
            onClick={handleToggleFloatingBuddy}
            title="Toggle mini desktop companion widget"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 980,
              background: isFloatingBuddyOn ? 'rgba(108, 134, 245, 0.22)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isFloatingBuddyOn ? '#6C86F5' : 'rgba(255, 255, 255, 0.1)'}`,
              color: isFloatingBuddyOn ? '#A9BCFF' : 'rgba(255, 255, 255, 0.75)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            <PipIcon size={14} color={isFloatingBuddyOn ? '#A9BCFF' : 'currentColor'} />
            <span>Mini Buddy</span>
          </button>

          {/* History Sheet Trigger */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'history' ? 'none' : 'history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 980,
              background: activeSheet === 'history' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            <HistoryIcon size={14} color="#FFFFFF" />
            <span>Sessions</span>
          </button>

          {/* Settings Sheet Trigger */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'settings' ? 'none' : 'settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 980,
              background: activeSheet === 'settings' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            <SettingsIcon size={14} color="#FFFFFF" />
            <span>Settings</span>
          </button>

          {/* Pair Mobile Companion Trigger */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'pairing' ? 'none' : 'pairing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 980,
              background: activeSheet === 'pairing' ? 'rgba(108, 134, 245, 0.3)' : 'rgba(108, 134, 245, 0.12)',
              border: '1px solid rgba(108, 134, 245, 0.3)',
              color: '#A9BCFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out'
            }}
          >
            <SmartphoneIcon size={14} color="#A9BCFF" />
            <span>Pair Phone</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE: TREY COVERS THE SCREEN, WATCHING CURSOR */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        {/* Alert Banner: Prompt user if NVIDIA NIM key is not configured */}
        {!hasApiKey && (
          <div
            onClick={() => setActiveSheet('settings')}
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              padding: '10px 18px',
              borderRadius: 14,
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#FDE68A',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <AlertIcon size={14} color="#F59E0B" />
            <span>NVIDIA NIM Key Required for Live AI Vision. Tap here to enter your key in Settings.</span>
            <span style={{ textDecoration: 'underline', fontWeight: 600, color: '#FCD34D' }}>Settings →</span>
          </div>
        )}

        {/* Living Blueberry Canvas (Rising Sun Mode in Dashboard - shifted right for zero card overlap) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingLeft: '140px',
            zIndex: 1
          }}
        >
          <TreyCharacter
            mode="rising-sun"
            mood={characterMood}
            talkLevel={talkLevel}
            gazePoint={gazePoint}
            interactive={true}
          />
        </div>

        {/* 3. APPLE FOCUS HUD OVERLAY */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 32px',
            zIndex: 10
          }}
        >
          {/* Classic Left-Docked Apple Focus Mission Card */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 28,
              width: 320,
              maxWidth: 'calc(100% - 56px)',
              pointerEvents: 'auto',
              zIndex: 20
            }}
          >
            {!session || session.status === 'ended' ? (
              /* Idle Mission Card */
              <div
                style={{
                  background: 'rgba(22, 19, 32, 0.78)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  borderRadius: 24,
                  padding: '20px 22px',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#A9BCFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px'
                    }}
                  >
                    New Focus Mission
                  </span>
                </div>
                <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 14, color: '#FFFFFF' }}>
                  What are we tackling?
                </div>

                <input
                  type="text"
                  placeholder="e.g. Design Apple UI, refactor compiler..."
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 14px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    outline: 'none',
                    marginBottom: 12
                  }}
                />

                {/* Duration Pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDurationInput(mins)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 10,
                        background: durationInput === mins ? '#6C86F5' : 'rgba(255, 255, 255, 0.06)',
                        border: durationInput === mins ? '1px solid #8FA6FF' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: durationInput === mins ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStart}
                  disabled={!taskInput.trim()}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 14,
                    background: taskInput.trim()
                      ? 'linear-gradient(135deg, #6C86F5 0%, #4254D6 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: taskInput.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: taskInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: taskInput.trim() ? '0 8px 24px rgba(66, 84, 214, 0.45)' : 'none',
                    marginBottom: 16
                  }}
                >
                  <PlayIcon size={14} color="currentColor" />
                  <span>Start Focus Session</span>
                </button>

                {/* Autonomous PC Takeover (Computer-Use) Button */}
                <button
                  onClick={takeoverRunning ? handleStopTakeover : handleStartTakeover}
                  disabled={!taskInput.trim()}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 14,
                    background: takeoverRunning
                      ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
                      : taskInput.trim()
                      ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: taskInput.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: taskInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: takeoverRunning
                      ? '0 0 20px rgba(239, 68, 68, 0.6)'
                      : taskInput.trim()
                      ? '0 8px 24px rgba(139, 92, 246, 0.4)'
                      : 'none',
                    marginBottom: 16
                  }}
                >
                  <span>{takeoverRunning ? '🛑 Stop Takeover (Ctrl+Alt+S)' : '⚡ Let Trey Do It (PC Takeover)'}</span>
                </button>
                {takeoverStatusMsg && (
                  <div style={{ fontSize: 11, color: '#A9BCFF', marginBottom: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(108,134,245,0.1)' }}>
                    {takeoverStatusMsg}
                  </div>
                )}

                {/* Agentic Research / Voice Query Subcard */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#A9BCFF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Ask Trey
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                      Hold <strong>J</strong> to speak
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder='Ask, close apps, or "point to..."'
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 11,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={handleResearch}
                      disabled={isResearching || !researchQuery.trim()}
                      style={{
                        padding: '0 12px',
                        borderRadius: 11,
                        background: isResearching ? 'rgba(255, 255, 255, 0.12)' : '#6C86F5',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isResearching || !researchQuery.trim() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isResearching ? '…' : '⚡ Ask'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Mission Card */
              <div
                style={{
                  background: 'rgba(22, 19, 32, 0.82)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  borderRadius: 24,
                  padding: '18px 20px',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: statusBadge.dot,
                      boxShadow: `0 0 10px ${statusBadge.dot}`
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A9BCFF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Active Mission
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.task}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 12, lineHeight: 1.4 }}>
                  {session.detail || 'Trey is observing your screen checks.'}
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (session.elapsed / session.duration) * 100))}%`,
                      background: 'linear-gradient(90deg, #6C86F5, #38BDF8)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ultra-Visible High-Contrast Nudge Banner */}
          {nudgeBanner && (
            <div
              style={{
                position: 'absolute',
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 520,
                width: '88%',
                background: 'rgba(24, 18, 36, 0.96)',
                backdropFilter: 'blur(36px)',
                WebkitBackdropFilter: 'blur(36px)',
                border: '2px solid rgba(108, 134, 245, 0.9)',
                borderRadius: 20,
                padding: '14px 20px',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.7), 0 0 30px rgba(108, 134, 245, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                zIndex: 35,
                pointerEvents: 'auto'
              }}
            >
              <AlertIcon size={20} color="#FF9500" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A9BCFF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
                  Trey Focus Alert
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.4 }}>
                  {nudgeBanner}
                </div>
              </div>
              <button
                onClick={() => setNudgeBanner(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Bottom HUD: Controls & Giant Clock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              width: '100%'
            }}
          >
            {/* Bottom-Left Frosted Action Circle Cluster */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                pointerEvents: 'auto'
              }}
            >
              {session && session.status !== 'ended' ? (
                <>
                  {/* Pause / Resume Button */}
                  <button
                    onClick={session.status === 'running' ? handlePause : handleResume}
                    title={session.status === 'running' ? 'Emergency Pause (Ctrl+2)' : 'Resume Focus (Ctrl+2)'}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      background: session.status === 'running' ? 'rgba(255, 255, 255, 0.12)' : '#34C759',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.12s ease-out',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {session.status === 'running' ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
                  </button>

                  {/* Stop Focus Button */}
                  <button
                    onClick={handleEnd}
                    title="End Focus Session"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      background: 'rgba(255, 59, 48, 0.18)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 59, 48, 0.4)',
                      color: '#FF453A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.12s ease-out',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <StopIcon size={20} color="#FF453A" />
                  </button>
                </>
              ) : null}

              {/* Push-to-Talk Mic Indicator */}
              <div
                title="Hold Ctrl+1 to speak to Trey"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                }}
              >
                <MicIcon size={20} color="#A9BCFF" />
              </div>

              {/* Quick Screen Check Button */}
              <button
                onClick={handleTestNudge}
                title="Send test nudge & check screen now"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                }}
              >
                <ScannerIcon size={20} color="#FFFFFF" />
              </button>
            </div>

            {/* Bottom-Center Interactive Timeline */}
            {session && session.checks.length > 0 && (
              <div style={{ flex: 1, maxWidth: 360, margin: '0 24px', pointerEvents: 'auto' }}>
                <TimelineBar checks={session.checks} onSelectCheck={setSelectedCheck} />
              </div>
            )}

            {/* Bottom-Right: Shortcuts pill when idle, countdown clock when active */}
            {session && session.status !== 'ended' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  pointerEvents: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: 76,
                    fontWeight: 600,
                    letterSpacing: '-2px',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#FFFFFF',
                    textShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
                  }}
                >
                  {formattedTime}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: 'rgba(255, 255, 255, 0.45)',
                    marginTop: 6,
                    textTransform: 'uppercase'
                  }}
                >
                  Time Remaining
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  borderRadius: 980,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.55)',
                  pointerEvents: 'auto'
                }}
              >
                <span>Voice: <strong style={{ color: '#A9BCFF' }}>Ctrl + 1</strong></span>
                <span>•</span>
                <span>Pause: <strong style={{ color: '#FFB340' }}>Ctrl + 2</strong></span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. CHECK INSPECTION MODAL */}
      {selectedCheck && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setSelectedCheck(null)}
        >
          <div
            style={{
              width: 440,
              background: '#161320',
              borderRadius: 24,
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#A9BCFF', textTransform: 'uppercase' }}>
                Check Details · {Math.round(selectedCheck.elapsed / 60)}m
              </span>
              <button
                onClick={() => setSelectedCheck(null)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              {selectedCheck.activity}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, marginBottom: 16 }}>
              On-task probability: {Math.round(selectedCheck.probability * 100)}% (Confidence: {Math.round(selectedCheck.confidence * 100)}%)
            </div>
            {selectedCheck.nudged && (
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255, 149, 0, 0.15)', border: '1px solid #FF9500', color: '#FFB340', fontSize: 13 }}>
                A gentle nudge was delivered to your screen.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SLIDE-UP APPLE GLASS SHEET: SESSIONS & HISTORY */}
      {activeSheet === 'history' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(36px) saturate(190%)',
            WebkitBackdropFilter: 'blur(36px) saturate(190%)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              height: '80%',
              background: '#13111C',
              borderRadius: '28px 28px 0 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 32px',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Focus Sessions</h2>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                  Your past missions and screen check breakdowns
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {historyList.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(255, 59, 48, 0.15)',
                      border: '1px solid rgba(255, 59, 48, 0.3)',
                      color: '#FF453A',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Clear History
                  </button>
                )}
                <button
                  onClick={() => setActiveSheet('none')}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            {/* Session List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', marginTop: 80, fontSize: 15 }}>
                  No completed focus sessions yet. Start a mission with Trey!
                </div>
              ) : (
                historyList.map((rec) => {
                  const dateStr = new Date(rec.startedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  const plannedMins = Math.round(rec.duration / 60)
                  const realMins = Math.round((rec.realElapsed || rec.elapsed) / 60)

                  return (
                    <div
                      key={rec.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: 16
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{rec.task}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>{dateStr}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 12 }}>
                        {realMins}m focused ({plannedMins}m target) · {rec.checks.length} screen checks
                      </div>
                      <TimelineBar checks={rec.checks} onSelectCheck={setSelectedCheck} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SLIDE-UP APPLE GLASS SHEET: SETTINGS */}
      {activeSheet === 'settings' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(36px) saturate(190%)',
            WebkitBackdropFilter: 'blur(36px) saturate(190%)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              height: '84%',
              background: '#13111C',
              borderRadius: '28px 28px 0 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 32px',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.7)',
              overflowY: 'auto'
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings & AI Vision</h2>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                  NVIDIA NIM API key, perception inspection, and developer options
                </div>
              </div>

              <button
                onClick={() => setActiveSheet('none')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Settings Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* NVIDIA NIM API Key & Live Integration Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: hasApiKey ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 22,
                  boxShadow: hasApiKey ? '0 0 20px rgba(52, 199, 89, 0.06)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <KeyIcon size={20} color={hasApiKey ? '#34C759' : '#6C86F5'} />
                    <span style={{ fontSize: 16, fontWeight: 600 }}>NVIDIA NIM Integration</span>
                  </div>
                  {hasApiKey ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '4px 12px', borderRadius: 980, fontSize: 12, fontWeight: 600, border: '1px solid rgba(52, 199, 89, 0.3)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759', boxShadow: '0 0 6px #34C759' }} />
                      <span>Connected & Active</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '4px 12px', borderRadius: 980, fontSize: 12, fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
                      <span>Key Required</span>
                    </div>
                  )}
                </div>

                {hasApiKey && (
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 16,
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Integrated Key:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#A9BCFF', letterSpacing: '0.5px' }}>
                        {maskedKey || 'nvapi-••••••••••••••'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Active Vision Model:</span>
                      <span style={{ color: '#FFFFFF', fontWeight: 500 }}>
                        {settings?.model || 'meta/llama-3.2-11b-vision-instruct'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 6 }}>
                      <span>Storage Security:</span>
                      <span style={{ color: '#34C759' }}>Windows DPAPI Hardware-bound Encryption</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        onClick={() => handleTestConnection()}
                        disabled={testingConnection}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'rgba(108, 134, 245, 0.16)',
                          border: '1px solid rgba(108, 134, 245, 0.35)',
                          color: '#A9BCFF',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: testingConnection ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {testingConnection ? 'Testing Connection...' : '⚡ Test Connection'}
                      </button>
                      <button
                        onClick={handleRemoveApiKey}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#F87171',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Remove Key
                      </button>
                    </div>
                  </div>
                )}

                {testFeedback.message && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 16,
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background:
                        testFeedback.type === 'success'
                          ? 'rgba(52, 199, 89, 0.15)'
                          : testFeedback.type === 'error'
                            ? 'rgba(239, 68, 68, 0.18)'
                            : 'rgba(255, 255, 255, 0.08)',
                      border:
                        testFeedback.type === 'success'
                          ? '1px solid rgba(52, 199, 89, 0.35)'
                          : testFeedback.type === 'error'
                            ? '1px solid rgba(239, 68, 68, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                      color:
                        testFeedback.type === 'success'
                          ? '#86EFAC'
                          : testFeedback.type === 'error'
                            ? '#FCA5A5'
                            : '#FFFFFF'
                    }}
                  >
                    <span>{testFeedback.type === 'success' ? '✅' : testFeedback.type === 'error' ? '⚠️' : 'ℹ️'}</span>
                    <span>{testFeedback.message}</span>
                  </div>
                )}

                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 12 }}>
                  {hasApiKey ? 'Update with a new key:' : 'Enter your personal key from build.nvidia.com (`nvapi-...`):'}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    placeholder={hasApiKey ? 'Enter new nvapi-... key to replace' : 'nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                      fontFamily: showKeyText ? 'monospace' : 'inherit'
                    }}
                  />
                  <button
                    onClick={() => setShowKeyText(!showKeyText)}
                    style={{
                      padding: '0 12px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {showKeyText ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim() || isSavingKey}
                    style={{
                      padding: '0 18px',
                      borderRadius: 10,
                      background: apiKeyInput.trim() ? '#6C86F5' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: apiKeyInput.trim() && !isSavingKey ? 'pointer' : 'not-allowed',
                      minWidth: 120
                    }}
                  >
                    {isSavingKey ? 'Verifying...' : hasApiKey ? 'Update Key' : 'Save & Verify'}
                  </button>
                </div>
              </div>

              {/* Vision AI Provider & Model Configuration */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 20
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Vision AI Provider & Model</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 16 }}>
                  Choose your multimodal AI backend for screen checks, OCR analysis, and agentic research.
                </div>

                {/* Provider Selector */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
                    Backend Provider:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { id: 'nim', label: 'NVIDIA NIM', desc: 'Nemotron-3.5 VL' },
                      { id: 'openai', label: 'OpenAI Vision', desc: 'gpt-4o-mini' },
                      { id: 'custom', label: 'Custom / Local', desc: 'Ollama / LM Studio' }
                    ].map((prov) => {
                      const isSelected = (settings?.provider || 'nim') === prov.id
                      return (
                        <button
                          key={prov.id}
                          onClick={async () => {
                            let newBaseUrl = 'https://integrate.api.nvidia.com/v1'
                            let newModel = 'nvidia/nemotron-3.5-super-vl-120b-a12b'
                            if (prov.id === 'openai') {
                              newBaseUrl = 'https://api.openai.com/v1'
                              newModel = 'gpt-4o-mini'
                            } else if (prov.id === 'custom') {
                              newBaseUrl = 'http://localhost:11434/v1'
                              newModel = 'llama3.2-vision'
                            }
                            if (dashboardAPI) {
                              await dashboardAPI.saveSettings({
                                provider: prov.id as 'nim' | 'openai' | 'custom',
                                baseUrl: newBaseUrl,
                                model: newModel
                              })
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      provider: prov.id as 'nim' | 'openai' | 'custom',
                                      baseUrl: newBaseUrl,
                                      model: newModel
                                    }
                                  : null
                              )
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: isSelected ? 'rgba(108, 134, 245, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isSelected ? '#6C86F5' : 'rgba(255, 255, 255, 0.08)'}`,
                            color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{prov.label}</div>
                          <div style={{ fontSize: 11, color: isSelected ? '#A9BCFF' : 'rgba(255, 255, 255, 0.45)' }}>{prov.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Base URL (if custom or openai) */}
                {(settings?.provider === 'custom' || settings?.provider === 'openai') && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
                      Base URL:
                    </div>
                    <input
                      type="text"
                      value={settings?.baseUrl || (settings?.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1')}
                      onChange={async (e) => {
                        const url = e.target.value
                        if (dashboardAPI) {
                          await dashboardAPI.saveSettings({ baseUrl: url })
                          setSettings((prev) => (prev ? { ...prev, baseUrl: url } : null))
                        }
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '9px 12px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* Model Selector */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
                    Active Vision Model:
                  </div>
                  <select
                    value={settings?.model || 'nvidia/nemotron-3.5-super-vl-120b-a12b'}
                    onChange={async (e) => {
                      const m = e.target.value
                      if (dashboardAPI) {
                        await dashboardAPI.saveSettings({ model: m })
                        setSettings((prev) => (prev ? { ...prev, model: m } : null))
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  >
                    {(
                      availableModels.length > 0
                        ? availableModels
                        : [
                            'nvidia/nemotron-3.5-super-vl-120b-a12b',
                            'nvidia/nemotron-3.5-lightning-30b-a3b',
                            'gpt-4o-mini',
                            'gpt-4o'
                          ]
                    ).map((mod) => (
                      <option key={mod} value={mod} style={{ background: '#1E1B29', color: '#FFFFFF' }}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Developer Mode & Acceleration */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Developer Mode</div>
                  <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
                    4x clock speed acceleration and screen checks every 10 seconds for rapid testing.
                  </div>
                </div>

                <button
                  onClick={handleToggleDevMode}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 980,
                    background: developerMode ? '#6C86F5' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {developerMode ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Hotkey Shortcuts Info */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 20
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Global Hotkeys</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>Push-to-Talk Voice</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#A9BCFF' }}>Hold J (or Ctrl+J / Alt+J)</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>Emergency Pause / Resume</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#FFB340' }}>Press K (or Ctrl+K / Alt+K)</div>
                  </div>
                </div>
              </div>

              {/* Perception Live Inspector */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Perception Inspector</div>
                    <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>
                      Capture a live screen snapshot with OCR bounding lines (zero disk write).
                    </div>
                  </div>
                  <button
                    onClick={handleCapturePerception}
                    disabled={isCapturing}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: '#6C86F5',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isCapturing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isCapturing ? 'Capturing...' : 'Capture Now'}
                  </button>
                </div>

                {perceptionDebug && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 8 }}>
                      Foreground App: {perceptionDebug.app.processName} · &quot;{perceptionDebug.app.windowTitle}&quot;
                    </div>
                    <div style={{ maxHeight: 240, overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <img
                        src={perceptionDebug.imageDataUrl}
                        alt="Screen perception debug"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Company & Authorship Footer */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: 16,
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.5)'
                }}
              >
                <div style={{ fontWeight: 600, color: '#A9BCFF', marginBottom: 2 }}>
                  Trey by The Nomin Company
                </div>
                <div>
                  Founded & Built by Chirag S • Engineered for 1000M+ Focused Users
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SLIDE-UP MODAL: MOBILE PAIRING & COMPANION */}
      {activeSheet === 'pairing' && (
        <PairingSheet onClose={() => setActiveSheet('none')} />
      )}
    </div>
  )
}
