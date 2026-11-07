import {
  SessionEngine,
  FocusSession,
  NudgePolicy,
  NimVisionProvider,
  FocusCheck,
  CheckResult,
  CoordinateMath,
  HistoryRecord,
  ResearchReport,
  AgentLoop
} from '@nomin/core'
import { screen } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { windows } from './windows'
import { updateTrayState } from './tray'
import { loadSettings, saveSettings, AppSettings } from './store'
import { perceptionManager } from './perception'
import { windowsSecretStore } from './platform/windows/WindowsSecretStore'
import { windowsHistoryStore } from './platform/windows/WindowsHistoryStore'
import { windowsScreenCapture } from './platform/windows/WindowsScreenCapture'
import { windowsInputSimulation } from './platform/windows/WindowsInputSimulation'
import { CompanionServer } from './pairing/CompanionServer.js'
import { TreyMood, FocusActivity, FocusCheck as ProtocolFocusCheck } from '@nomin/protocol'

const execAsync = promisify(exec)

interface DistractionDetection {
  isDistraction: boolean
  matchedKeyword?: string
  targetLine?: { text: string; rect: { x: number; y: number; width: number; height: number } }
}

function detectDistraction(
  declaredTask: string,
  app: { processName: string; windowTitle: string },
  ocrLines: Array<{ line: { id: string; text: string; rect: { x: number; y: number; width: number; height: number } } }>
): DistractionDetection {
  const normTask = declaredTask.toLowerCase()
  const isWorkTask = /coding|code|programming|dev|development|software|engineer|study|work|typing|writing|reading|research|nomin|trey|task|project/.test(normTask)

  if (!isWorkTask) {
    return { isDistraction: false }
  }

  const blacklist = [
    'instagram',
    'instagram.com',
    'x.com',
    'twitter.com',
    'reddit.com',
    'tiktok.com',
    'facebook.com',
    'youtube.com/shorts',
    'youtube.com/feed',
    'netflix.com',
    'twitch.tv'
  ]

  const titleLower = (app.windowTitle || '').toLowerCase()
  const procLower = (app.processName || '').toLowerCase()

  for (const item of blacklist) {
    if (titleLower.includes(item) || procLower.includes(item)) {
      const target = ocrLines.find((l) => l.line.text.toLowerCase().includes(item))?.line
      return { isDistraction: true, matchedKeyword: item, targetLine: target }
    }
  }

  for (const l of ocrLines) {
    const textLower = l.line.text.toLowerCase()
    for (const item of blacklist) {
      if (textLower.includes(item)) {
        return { isDistraction: true, matchedKeyword: item, targetLine: l.line }
      }
    }
  }

  return { isDistraction: false }
}

export class FocusCoordinator {
  private engine = new SessionEngine()
  private policy = new NudgePolicy()
  private provider: NimVisionProvider
  private tickInterval: NodeJS.Timeout | null = null
  private developerMode = false

  private lastCheckElapsed = 0
  private isChecking = false
  private activeAgentLoop: AgentLoop | null = null
  private apiKeyReady: Promise<void>
  private companionServer: CompanionServer | null = null
  private syncRevision = 0

  setCompanionServer(server: CompanionServer): void {
    this.companionServer = server
  }

  broadcastFace(gazeX: number, gazeY: number, mood: TreyMood, talk = 0): void {
    if (this.companionServer) {
      this.companionServer.broadcast({
        type: 'face',
        gazeX,
        gazeY,
        mood,
        talk
      })
    }
  }

  constructor() {
    const settings = loadSettings()
    // Requirement 5: Developer Mode must default to OFF and never persist across restarts
    this.developerMode = false
    this.policy = new NudgePolicy({
      developerMode: this.developerMode,
      maxCheckLatencySec: settings.maxCheckLatencySec ?? 45
    })
    this.provider = new NimVisionProvider('', {
      baseUrl: settings.baseUrl,
      rpmLimit: settings.rpmLimit ?? 30,
      fallbackModels: settings.fallbackModels
    })
    if (settings.model) {
      this.provider.setModel(settings.model, settings.fallbackModels)
    }

    this.apiKeyReady = Promise.resolve()

    // Listen to governor state changes
    this.provider.governor.onStatusChange(() => {
      this.publishSync()
    })
  }

  async init(): Promise<void> {
    try {
      const key = await windowsSecretStore.getSecret('nim_api_key')
      if (key && key.trim().length > 0) {
        const trimmed = key.trim()
        this.provider.setApiKey(trimmed)
        // Background audit to verify models and lock in optimal vision & reasoning models
        this.provider.client.auditKey(trimmed, this.provider.client.getBaseUrl()).then((audit) => {
          if (audit.success) {
            this.provider.setModel(audit.visionModel, audit.fallbackVisionModels)
            this.provider.client.setTextModel(audit.textModel)
            const settings = loadSettings()
            saveSettings({
              ...settings,
              model: audit.visionModel,
              fallbackModels: audit.fallbackVisionModels,
              baseUrl: audit.baseUrl,
              provider: audit.provider
            })
            this.publishSync()
          }
        }).catch(() => {})
      }
    } catch (error: unknown) {
      console.error('Could not load saved API key on init:', error instanceof Error ? error.message : 'unknown error')
    }
    this.publishSync()
  }

  get isDeveloperMode(): boolean {
    return this.developerMode
  }

  get hasApiKey(): boolean {
    return this.provider.client.hasApiKey()
  }

  getMaskedKey(): string | null {
    return this.provider.getMaskedKey()
  }

  async testApiKey(candidate?: string): Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }> {
    const audit = await this.provider.client.auditKey(candidate, this.provider.client.getBaseUrl())
    return {
      success: audit.success,
      modelCount: audit.allModelsCount,
      latencyMs: audit.latencyMs,
      error: audit.error
    }
  }

  get session(): FocusSession | null {
    return this.engine.getSession()
  }

  get visionProvider(): NimVisionProvider {
    return this.provider
  }

  async setApiKey(key: string): Promise<{ success: boolean; modelCount?: number; latencyMs: number; error?: string }> {
    const trimmed = key.trim()
    this.provider.setApiKey(trimmed)
    this.apiKeyReady = windowsSecretStore.setSecret('nim_api_key', trimmed)
    await this.apiKeyReady

    if (trimmed) {
      const audit = await this.provider.client.auditKey(trimmed, this.provider.client.getBaseUrl())
      if (audit.success) {
        this.provider.setModel(audit.visionModel, audit.fallbackVisionModels)
        this.provider.client.setTextModel(audit.textModel)
        const settings = loadSettings()
        saveSettings({
          ...settings,
          model: audit.visionModel,
          fallbackModels: audit.fallbackVisionModels,
          baseUrl: audit.baseUrl,
          provider: audit.provider
        })
      }
      this.publishSync()
      return {
        success: audit.success,
        modelCount: audit.allModelsCount,
        latencyMs: audit.latencyMs,
        error: audit.error
      }
    }

    this.publishSync()
    return { success: true, latencyMs: 0 }
  }

  async removeApiKey(): Promise<void> {
    this.provider.setApiKey('')
    await windowsSecretStore.deleteSecret('nim_api_key')
    this.publishSync()
  }

  applySettings(settings: Partial<AppSettings>): void {
    if (settings.baseUrl) {
      this.provider.setBaseUrl(settings.baseUrl)
    }
    if (settings.model) {
      this.provider.setModel(settings.model, settings.fallbackModels)
    }
    if (settings.rpmLimit) {
      this.provider.setRpmLimit(settings.rpmLimit)
    }
    if (settings.maxCheckLatencySec) {
      this.policy.setMaxLatency(settings.maxCheckLatencySec)
    }
    if (settings.developerMode !== undefined) {
      this.setDeveloperMode(settings.developerMode)
    }
  }

  async getHistory(): Promise<HistoryRecord[]> {
    return windowsHistoryStore.loadHistory()
  }

  async clearHistory(): Promise<void> {
    return windowsHistoryStore.clearHistory()
  }

  start(task: string, minutes = 30): string {
    const durationSeconds = minutes * 60
    const session = this.engine.start(task, durationSeconds, this.developerMode)

    const settings = loadSettings()
    this.policy = new NudgePolicy({
      developerMode: this.developerMode,
      maxCheckLatencySec: settings.maxCheckLatencySec ?? 45
    })
    this.lastCheckElapsed = 0

    if (this.tickInterval) clearInterval(this.tickInterval)
    // Requirement 3: 250ms interval so display never skips a second
    this.tickInterval = setInterval(() => this.tick(), 250)

    this.publishSync()
    updateTrayState(this)
    return `Focus started: ${session.task} for ${minutes} minutes.`
  }

  pause(reason = 'Paused'): string {
    if (this.engine.status !== 'running') return 'No running session to pause.'
    this.engine.pause(reason)
    this.policy.onPause()
    this.publishSync()
    updateTrayState(this)
    return 'Focus paused.'
  }

  resume(): string {
    if (this.engine.status !== 'paused') return 'No paused session to resume.'
    this.engine.resume()
    this.policy.reset()
    this.publishSync()
    updateTrayState(this)
    return 'Focus resumed.'
  }

  end(): string {
    if (this.engine.status === 'idle') return 'No session to end.'
    this.engine.end()
    this.policy.onEnd()
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    this.persistCurrentSession()
    this.publishSync()
    updateTrayState(this)
    return 'Focus session ended.'
  }

  setDeveloperMode(enabled: boolean): string {
    this.developerMode = enabled
    // Requirement 5: Never persist developer mode across restarts unless explicitly asked
    this.engine.setDeveloperMode(enabled)
    this.policy.setDeveloperMode(enabled)
    this.publishSync()
    updateTrayState(this)
    return enabled
      ? 'Developer Mode enabled (4x clock, 10s checks).'
      : 'Developer Mode disabled (normal clock, 30s checks).'
  }

  isTakeoverActive(): boolean {
    return this.activeAgentLoop !== null
  }

  async startTakeover(task: string): Promise<{ success: boolean; summary: string }> {
    if (this.activeAgentLoop) {
      return { success: false, summary: 'A computer-use takeover is already active.' }
    }

    const trimmedTask = task.trim()
    if (!trimmedTask) {
      return { success: false, summary: 'Task description cannot be empty.' }
    }

    if (!this.provider.client.hasApiKey()) {
      return { success: false, summary: 'Please configure your NVIDIA NIM API key first.' }
    }

    // Set companion character to thinking expression
    if (windows.face && !windows.face.isDestroyed()) {
      windows.face.webContents.send('face:expression', 'thinking')
    }

    // Initialize overlay takeover banner
    if (windows.overlay && !windows.overlay.isDestroyed()) {
      windows.overlay.webContents.send('overlay:takeoverStatus', {
        active: true,
        task: trimmedTask,
        step: 0,
        maxSteps: 25,
        thought: 'Initializing visual perception…'
      })
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const allDisplays = screen.getAllDisplays()
    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0
    for (const d of allDisplays) {
      minX = Math.min(minX, d.bounds.x)
      minY = Math.min(minY, d.bounds.y)
      maxX = Math.max(maxX, d.bounds.x + d.bounds.width)
      maxY = Math.max(maxY, d.bounds.y + d.bounds.height)
    }

    const virtualDesk = {
      left: Math.round(minX * primaryDisplay.scaleFactor),
      top: Math.round(minY * primaryDisplay.scaleFactor),
      width: Math.round((maxX - minX) * primaryDisplay.scaleFactor),
      height: Math.round((maxY - minY) * primaryDisplay.scaleFactor)
    }

    this.activeAgentLoop = new AgentLoop(
      this.provider.client,
      this.provider.governor,
      windowsScreenCapture,
      windowsInputSimulation
    )

    try {
      const result = await this.activeAgentLoop.run({
        task: trimmedTask,
        maxSteps: 25,
        display: {
          x: primaryDisplay.bounds.x,
          y: primaryDisplay.bounds.y,
          width: primaryDisplay.bounds.width,
          height: primaryDisplay.bounds.height,
          scaleFactor: primaryDisplay.scaleFactor
        },
        virtualScreen: virtualDesk,
        onStepProgress: (step, maxSteps, thought, action) => {
          if (windows.overlay && !windows.overlay.isDestroyed()) {
            windows.overlay.webContents.send('overlay:takeoverStatus', {
              active: true,
              task: trimmedTask,
              step,
              maxSteps,
              thought
            })
          }
          if (windows.face && !windows.face.isDestroyed()) {
            const expr = action.type === 'click' || action.type === 'type' ? 'talking' : 'pointing'
            windows.face.webContents.send('face:expression', expr)
          }
        },
        onAnimateCursor: async (logicalX, logicalY, actionType) => {
          if (windows.overlay && !windows.overlay.isDestroyed()) {
            windows.overlay.webContents.send('overlay:animateCursor', {
              x: logicalX,
              y: logicalY,
              actionType,
              durationMs: 450
            })
          }
          if (windows.face && !windows.face.isDestroyed()) {
            windows.face.webContents.send('face:expression', 'pointing')
          }
          // Dwell for smooth visual travel before real physical click executes
          await new Promise((r) => setTimeout(r, 450))

          if (windows.overlay && !windows.overlay.isDestroyed()) {
            windows.overlay.webContents.send('overlay:triggerRipple', {
              x: logicalX,
              y: logicalY,
              button: actionType === 'right_click' ? 'right' : 'left'
            })
          }
        }
      })

      if (windows.face && !windows.face.isDestroyed()) {
        windows.face.webContents.send('face:expression', result.success ? 'happy' : 'resting')
      }

      return result
    } finally {
      this.activeAgentLoop = null
      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:takeoverStatus', { active: false })
      }
    }
  }

  stopTakeover(): void {
    if (this.activeAgentLoop) {
      this.activeAgentLoop.stop()
      this.activeAgentLoop = null
    }
    if (windows.overlay && !windows.overlay.isDestroyed()) {
      windows.overlay.webContents.send('overlay:takeoverStatus', { active: false })
    }
    if (windows.face && !windows.face.isDestroyed()) {
      windows.face.webContents.send('face:expression', 'resting')
    }
  }

  private async persistCurrentSession(): Promise<void> {
    const session = this.engine.getSession()
    if (!session) return
    await windowsHistoryStore.saveSession({
      id: session.id,
      task: session.task,
      startedAt: session.startedAt,
      endedAt: Date.now(),
      duration: session.duration,
      elapsed: session.elapsed,
      realElapsed: this.engine.realActiveElapsed,
      usedDeveloperMode: Boolean(session.usedDeveloperMode || session.developerMode),
      checks: session.checks.map((c) => ({
        id: c.id,
        elapsed: c.elapsed,
        activity: c.activity,
        probability: c.probability,
        probabilities: c.probabilities as { on_task?: number; off_task?: number; uncertain?: number },
        confidence: c.confidence,
        nudged: Boolean(c.nudged)
      }))
    })
  }

  private tick(): void {
    const initialStatus = this.engine.status
    if (initialStatus !== 'running') return

    // Requirement 3: timestamp-based monotonic clock computation, never decrements fixed number
    this.engine.syncClock(Date.now())
    this.publishSync()
    updateTrayState(this)

    const updatedSession = this.engine.getSession()
    if (updatedSession?.status === 'ended') {
      if (this.tickInterval) {
        clearInterval(this.tickInterval)
        this.tickInterval = null
      }
      this.persistCurrentSession()
      return
    }

    // Trigger perception & AI check at each observation interval
    if (
      updatedSession &&
      updatedSession.elapsed - this.lastCheckElapsed >= this.engine.observationDuration &&
      !this.isChecking
    ) {
      this.lastCheckElapsed = updatedSession.elapsed
      this.performCheck(updatedSession)
    }
  }

  private async performCheck(session: FocusSession): Promise<void> {
    this.isChecking = true

    try {
      this.engine.setDetail('Capturing screen and checking focus…')
      this.publishSync()
      await this.apiKeyReady

      // 1. Capture screen & OCR text
      const snapshot = await perceptionManager.snapshot()
      const base64Jpeg = Buffer.from(snapshot.capture.jpeg).toString('base64')
      const screenText = snapshot.ocr.lines.map((l) => l.line.text).join('\n')

      // 2. Smart Distraction Guardrail check (works instantly even without API key)
      const distraction = detectDistraction(session.task, snapshot.app, snapshot.ocr.lines)

      // Fallback path when NVIDIA NIM API key is not yet configured
      if (!this.provider.client.hasApiKey()) {
        if (distraction.isDistraction) {
          const offResult: CheckResult = {
            t: session.elapsed,
            choice: 'off_task',
            pOff: 0.98,
            pOn: 0.01,
            pUnc: 0.01,
            confidence: 0.95,
            valid: true,
            latencySec: 0.1
          }
          const shouldNudge = this.policy.observe(offResult, { immediate: true })
          const checkItem: FocusCheck = {
            id: `check-${Date.now()}`,
            elapsed: session.elapsed,
            activity: 'off_task',
            probability: 0.98,
            probabilities: { on_task: 0.01, off_task: 0.98, uncertain: 0.01 },
            confidence: 0.95,
            sampleDuration: this.engine.observationDuration,
            nudged: shouldNudge
          }
          this.engine.recordCheck(
            checkItem,
            `Off task: ${distraction.matchedKeyword || 'distraction'} detected (Add NVIDIA NIM key in Settings for live vision AI)`
          )

          if (shouldNudge) {
            this.deliverNudgeDirect(
              session,
              `Hey! ${distraction.matchedKeyword || 'That'} doesn't look like ${session.task}. Let's get back to it!`,
              distraction.targetLine,
              snapshot.capture
            )
          }
        } else {
          // On-task local heuristic
          const onResult: CheckResult = {
            t: session.elapsed,
            choice: 'on_task',
            pOff: 0.05,
            pOn: 0.95,
            pUnc: 0,
            confidence: 0.85,
            valid: true,
            latencySec: 0.1
          }
          this.policy.observe(onResult)
          this.engine.recordCheck(
            {
              id: `check-${Date.now()}`,
              elapsed: session.elapsed,
              activity: 'on_task',
              probability: 0.05,
              probabilities: { on_task: 0.95, off_task: 0.05, uncertain: 0 },
              confidence: 0.85,
              sampleDuration: this.engine.observationDuration,
              nudged: false
            },
            'On task · Local guardrails active (Add NVIDIA NIM key in Settings for live vision AI)'
          )
        }
        this.publishSync()
        return
      }

      // Check governor rate limits
      const govStatus = this.provider.governor.getStatus()
      if (govStatus.state === 'cooling_down') {
        const uncheckedResult: CheckResult = {
          t: session.elapsed,
          choice: 'unavailable',
          pOff: 0,
          pOn: 0,
          pUnc: 0,
          confidence: 0,
          valid: false,
          latencySec: 0
        }
        this.policy.observe(uncheckedResult)
        const checkItem: FocusCheck = {
          id: `check-${Date.now()}`,
          elapsed: session.elapsed,
          activity: 'unavailable',
          probability: 0,
          probabilities: { on_task: 0, off_task: 0, uncertain: 0 },
          confidence: 0,
          nudged: false
        }
        this.engine.recordCheck(checkItem, `NIM cooling down (${govStatus.secondsLeft}s left)`)
        this.publishSync()
        return
      }

      // 3. Build history string (last 8 results)
      const historyStr = session.checks
        .slice(-8)
        .map(
          (c) =>
            `${Math.round(c.elapsed)}s: ${c.activity}, P(off)=${c.probability.toFixed(2)}, conf=${c.confidence.toFixed(2)}`
        )
        .join('\n')

      // 4. Classify with NVIDIA NIM Multimodal Vision
      let result = await this.provider.classify({
        task: session.task,
        realActiveElapsed: this.engine.realActiveElapsed,
        elapsed: session.elapsed,
        clockRate: this.engine.clockRate,
        idleSeconds: snapshot.idleSeconds,
        recentHistory: historyStr,
        foregroundApp: snapshot.app.processName,
        screenText,
        jpegBase64: base64Jpeg
      })

      // If local guardrail caught obvious distraction, override or enhance result
      if (distraction.isDistraction && result.choice !== 'off_task') {
        result = {
          t: session.elapsed,
          choice: 'off_task',
          pOff: 0.98,
          pOn: 0.01,
          pUnc: 0.01,
          confidence: 0.95,
          valid: true,
          latencySec: result.latencySec
        }
      }

      // 5. Feed result into NudgePolicy (immediate if obvious distraction)
      const shouldNudge = this.policy.observe(result, { immediate: distraction.isDistraction })

      const focusCheck: FocusCheck = {
        id: `check-${Date.now()}`,
        elapsed: session.elapsed,
        activity: result.choice,
        probability: result.pOff,
        probabilities: {
          on_task: result.pOn,
          off_task: result.pOff,
          uncertain: result.pUnc
        },
        confidence: result.confidence,
        sampleDuration: this.engine.observationDuration,
        nudged: shouldNudge
      }

      const detail =
        result.choice === 'unavailable'
          ? `NIM check failed: ${result.error || 'No valid classification returned.'}`
          : result.choice === 'on_task'
            ? 'On task'
            : result.choice === 'off_task'
              ? shouldNudge
                ? 'Trey nudged you'
                : 'Off task · checking again before nudging'
              : 'Ambiguous context · observing'
      this.engine.recordCheck(focusCheck, detail)

      // 6. Deliver nudge if triggered
      if (shouldNudge) {
        if (distraction.isDistraction && distraction.targetLine) {
          this.deliverNudgeDirect(
            session,
            `Hey! ${distraction.matchedKeyword || 'This'} doesn't look like ${session.task}.`,
            distraction.targetLine,
            snapshot.capture
          )
        } else {
          this.deliverNudge(session, snapshot.ocr.lines, base64Jpeg, snapshot.app.processName, snapshot.capture)
        }
      }

      this.publishSync()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Check loop error:', message)
      this.engine.setDetail(`Screen check failed: ${message.slice(0, 180)}`)
      this.publishSync()
    } finally {
      this.isChecking = false
    }
  }

  private deliverNudgeDirect(
    session: FocusSession,
    message: string,
    targetRect?: { text: string; rect: { x: number; y: number; width: number; height: number } },
    captureResult?: { width: number; height: number; scaleFactor: number; displayId: string }
  ): void {
    if (windows.face && !windows.face.isDestroyed()) {
      windows.face.webContents.send('face:expression', 'pointing')
    }

    let verifiedTarget: { x: number; y: number; text: string; width?: number; height?: number } | undefined = undefined

    if (targetRect && captureResult) {
      const primaryDisplay = screen.getPrimaryDisplay()
      const screenBox = CoordinateMath.ocrToScreenPoint(
        targetRect.rect,
        captureResult,
        {
          x: primaryDisplay.bounds.x,
          y: primaryDisplay.bounds.y,
          width: primaryDisplay.bounds.width,
          height: primaryDisplay.bounds.height,
          scaleFactor: primaryDisplay.scaleFactor
        }
      )
      verifiedTarget = {
        x: screenBox.x + screenBox.width / 2,
        y: screenBox.y + screenBox.height / 2,
        width: Math.max(screenBox.width, 120),
        height: Math.max(screenBox.height, 36),
        text: targetRect.text
      }
    }

    if (windows.overlay && !windows.overlay.isDestroyed()) {
      windows.overlay.webContents.send('overlay:nudge', {
        message,
        target: verifiedTarget
      })
    }
  }

  private async deliverNudge(
    session: FocusSession,
    ocrLines: Array<{ line: { id: string; text: string; rect: { x: number; y: number; width: number; height: number } } }>,
    base64Jpeg: string,
    initialApp: string,
    captureResult: { width: number; height: number; scaleFactor: number; displayId: string }
  ): Promise<void> {
    try {
      const targetsList = ocrLines.map((l) => `${l.line.id} "${l.line.text}"`).join('\n')
      const nudge = await this.provider.generateNudge({
        task: session.task,
        targetsList,
        jpegBase64: base64Jpeg
      })

      let verifiedTarget: { x: number; y: number; text: string; width?: number; height?: number } | undefined = undefined

      // Target re-verification
      if (nudge.targetId && nudge.targetQuote) {
        const candidateLine = ocrLines.find((l) => l.line.id === nudge.targetId)
        if (candidateLine && candidateLine.line.text === nudge.targetQuote) {
          const verifySnap = await perceptionManager.snapshot()
          if (verifySnap.app.processName === initialApp) {
            const found = verifySnap.ocr.lines.find(
              (vl) =>
                vl.line.text === nudge.targetQuote &&
                Math.abs(vl.line.rect.x - candidateLine.line.rect.x) < 20 &&
                Math.abs(vl.line.rect.y - candidateLine.line.rect.y) < 20
            )
            if (found) {
              const primaryDisplay = screen.getPrimaryDisplay()
              const screenBox = CoordinateMath.ocrToScreenPoint(
                found.line.rect,
                captureResult,
                {
                  x: primaryDisplay.bounds.x,
                  y: primaryDisplay.bounds.y,
                  width: primaryDisplay.bounds.width,
                  height: primaryDisplay.bounds.height,
                  scaleFactor: primaryDisplay.scaleFactor
                }
              )
              verifiedTarget = {
                x: screenBox.x + screenBox.width / 2,
                y: screenBox.y + screenBox.height / 2,
                width: Math.max(screenBox.width, 120),
                height: Math.max(screenBox.height, 36),
                text: found.line.text
              }
            }
          }
        }
      }

      if (windows.face && !windows.face.isDestroyed()) {
        windows.face.webContents.send('face:expression', verifiedTarget ? 'pointing' : 'talking')
      }

      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:nudge', {
          message: nudge.message,
          target: verifiedTarget
        })
      }
    } catch {
      // Fallback bubble alone
      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:nudge', {
          message: "Are you sure you're on task right now?"
        })
      }
    }
  }

  async performResearch(question: string): Promise<ResearchReport> {
    if (windows.face && !windows.face.isDestroyed()) {
      windows.face.webContents.send('face:expression', 'thinking')
    }

    const qLower = question.toLowerCase().trim()

    // Identity and Attribution: The Nomin Company (founded by Chirag S)
    if (
      /who (are you|made you|created you|built you|owns you)/i.test(qLower) ||
      /what is trey/i.test(qLower)
    ) {
      const idReport: ResearchReport = {
        question,
        title: 'Trey by The Nomin Company',
        paragraphs: [
          'I am Trey, an autonomous desktop companion and focus partner made and owned by The Nomin Company.',
          'The Nomin Company was founded by Chirag S to engineer next-generation intelligent desktop systems.',
          'I keep your focus locked in, watch your screen for drift, execute computer tasks, and conduct deep research.'
        ],
        sources: [{ title: 'The Nomin Company', url: 'https://github.com/chiragsatish2011-pixel/Nomin-s-Trey' }],
        plainText: 'I am Trey, made by The Nomin Company (founded by Chirag S).',
        takeaway: 'I am Trey, proudly made by The Nomin Company, founded by Chirag S!'
      }

      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:report', idReport)
        windows.overlay.webContents.send('overlay:nudge', { message: idReport.takeaway })
      }
      if (windows.face && !windows.face.isDestroyed()) {
        windows.face.webContents.send('face:expression', 'happy')
      }
      return idReport
    }

    if (
      /who made (the )?nomin/i.test(qLower) ||
      /who (founded|owns|created) (the )?nomin/i.test(qLower) ||
      /who is chirag/i.test(qLower)
    ) {
      const founderReport: ResearchReport = {
        question,
        title: 'The Nomin Company — Founder',
        paragraphs: [
          'The Nomin Company was founded and built by Chirag S.',
          'Chirag S leads the development of autonomous, high-velocity desktop intelligence platforms.',
          'The Nomin Company is the creator and owner of Trey and its companion ecosystem.'
        ],
        sources: [{ title: 'The Nomin Company', url: 'https://github.com/chiragsatish2011-pixel/Nomin-s-Trey' }],
        plainText: 'The Nomin Company was founded and built by Chirag S.',
        takeaway: 'The Nomin Company was founded and built by Chirag S.'
      }

      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:report', founderReport)
        windows.overlay.webContents.send('overlay:nudge', { message: founderReport.takeaway })
      }
      if (windows.face && !windows.face.isDestroyed()) {
        windows.face.webContents.send('face:expression', 'happy')
      }
      return founderReport
    }

    try {
      const snapshot = await perceptionManager.snapshot()
      const contextText = [
        `Foreground app: ${snapshot.app.processName} (${snapshot.app.windowTitle})`,
        `Screen OCR text: ${snapshot.ocr.lines.slice(0, 40).map((l) => l.line.text).join(' ')}`
      ].join('\n')

      const base64Jpeg = Buffer.from(snapshot.capture.jpeg).toString('base64')

      await this.apiKeyReady
      if (!this.provider.client.hasApiKey()) {
        const fallbackReport: ResearchReport = {
          question,
          title: 'API Key Required',
          paragraphs: [
            'To perform autonomous agentic research, Trey needs an API key.',
            'Open Settings in the dashboard (click the gear icon) and paste any valid API key (NVIDIA NIM, OpenAI, OpenRouter, Groq, or custom).',
            'Trey will automatically audit available models and choose the fastest vision and reasoning pipeline for you.'
          ],
          sources: [
            { title: 'The Nomin Company', url: 'https://github.com/chiragsatish2011-pixel/Nomin-s-Trey' },
            { title: 'NVIDIA NIM API', url: 'https://build.nvidia.com/' },
            { title: 'OpenAI API', url: 'https://platform.openai.com/' }
          ],
          plainText: 'API Key Required: Add your API key in Settings.',
          takeaway: 'Add your API key in Settings to unlock autonomous research!'
        }

        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:report', fallbackReport)
          windows.overlay.webContents.send('overlay:nudge', {
            message: fallbackReport.takeaway
          })
        }
        return fallbackReport
      }

      const report = await this.provider.research(question, contextText, base64Jpeg)

      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:report', report)
        windows.overlay.webContents.send('overlay:nudge', {
          message: report.takeaway
        })
      }

      if (windows.face && !windows.face.isDestroyed()) {
        windows.face.webContents.send('face:expression', 'happy')
      }

      return report
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Research failed'
      const errReport: ResearchReport = {
        question,
        title: 'Research Encountered an Issue',
        paragraphs: [
          `Trey attempted to research your question, but encountered an error: ${msg.slice(0, 160)}`,
          'Please verify your API key and network connection, then try again.'
        ],
        sources: [],
        plainText: `Research failed: ${msg}`,
        takeaway: 'I hit a snag researching that. Check Settings and try again!'
      }

      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:report', errReport)
        windows.overlay.webContents.send('overlay:nudge', { message: errReport.takeaway })
      }
      return errReport
    }
  }

  async pointAtTarget(queryText: string): Promise<boolean> {
    try {
      const snap = await perceptionManager.snapshot()
      const clean = queryText.toLowerCase().replace(/^(point to|find|where is|point at|show me)\s+/i, '').trim()
      const matched = snap.ocr.lines.find((l) => l.line.text.toLowerCase().includes(clean))?.line

      if (matched) {
        if (windows.face && !windows.face.isDestroyed()) {
          windows.face.webContents.send('face:expression', 'pointing')
        }
        const primaryDisplay = screen.getPrimaryDisplay()
        const screenBox = CoordinateMath.ocrToScreenPoint(
          matched.rect,
          snap.capture,
          {
            x: primaryDisplay.bounds.x,
            y: primaryDisplay.bounds.y,
            width: primaryDisplay.bounds.width,
            height: primaryDisplay.bounds.height,
            scaleFactor: primaryDisplay.scaleFactor
          }
        )
        const targetPoint = {
          x: screenBox.x + screenBox.width / 2,
          y: screenBox.y + screenBox.height / 2,
          width: Math.max(screenBox.width, 120),
          height: Math.max(screenBox.height, 36),
          text: matched.text
        }
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: `Found it right here: "${matched.text}"`,
            target: targetPoint
          })
        }
        return true
      } else {
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: `I looked across your screen, but couldn't spot "${clean}".`
          })
        }
        return false
      }
    } catch (err) {
      console.warn('pointAtTarget error:', err)
      return false
    }
  }

  async closeApp(targetName: string): Promise<{ success: boolean; message: string }> {
    const raw = targetName
      .toLowerCase()
      .replace(/^(close|quit|kill|exit|shut down|terminate|stop)\s+(the\s+)?/i, '')
      .replace(/(\s+application|\s+app|\s+program)$/i, '')
      .trim()

    const map: Record<string, string[]> = {
      chrome: ['chrome.exe'],
      'google chrome': ['chrome.exe'],
      edge: ['msedge.exe'],
      'microsoft edge': ['msedge.exe'],
      firefox: ['firefox.exe'],
      discord: ['Discord.exe'],
      spotify: ['Spotify.exe'],
      code: ['Code.exe'],
      vscode: ['Code.exe'],
      'vs code': ['Code.exe'],
      notepad: ['notepad.exe'],
      calculator: ['CalculatorApp.exe', 'calc.exe'],
      calc: ['calc.exe', 'CalculatorApp.exe'],
      slack: ['slack.exe'],
      teams: ['Teams.exe', 'ms-teams.exe'],
      steam: ['steam.exe'],
      terminal: ['WindowsTerminal.exe'],
      instagram: ['chrome.exe', 'msedge.exe']
    }

    const procsToTry = map[raw] || [`${raw.replace(/\.exe$/i, '')}.exe`]

    for (const proc of procsToTry) {
      try {
        await execAsync(`taskkill /F /IM ${proc}`)
        const replyMsg = `Closed ${raw.toUpperCase()} (${proc}) for you!`
        if (windows.face && !windows.face.isDestroyed()) {
          windows.face.webContents.send('face:expression', 'happy')
        }
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: replyMsg
          })
        }
        return { success: true, message: replyMsg }
      } catch {
        // try next candidate
      }
    }

    // PowerShell fallback partial matching
    try {
      const clean = raw.replace(/[^a-z0-9_-]/gi, '')
      if (clean.length >= 3) {
        await execAsync(`powershell.exe -NoProfile -Command "Stop-Process -Name '*${clean}*' -Force"`)
        const replyMsg = `Terminated running processes for "${raw}".`
        if (windows.face && !windows.face.isDestroyed()) {
          windows.face.webContents.send('face:expression', 'happy')
        }
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: replyMsg
          })
        }
        return { success: true, message: replyMsg }
      }
    } catch {
      // not running
    }

    const notFoundMsg = `I couldn't find any running application for "${raw}".`
    if (windows.overlay && !windows.overlay.isDestroyed()) {
      windows.overlay.webContents.send('overlay:nudge', {
        message: notFoundMsg
      })
    }
    return { success: false, message: notFoundMsg }
  }

  publishSync(): void {
    const current = this.engine.getSession()
    const govStatus = this.provider.governor.getStatus()

    const syncData = {
      current,
      developerMode: this.developerMode,
      formattedTime: current ? SessionEngine.formatClock(current.duration - current.elapsed) : '00:00',
      governor: govStatus,
      hasApiKey: this.provider.client.hasApiKey(),
      maskedKey: this.provider.getMaskedKey(),
      activeModel: this.provider.client.getModels()[0]
    }

    if (windows.dashboard && !windows.dashboard.isDestroyed()) {
      windows.dashboard.webContents.send('focus:sync', syncData)
    }
    if (windows.face && !windows.face.isDestroyed()) {
      windows.face.webContents.send('focus:sync', syncData)
    }

    if (this.companionServer) {
      this.syncRevision += 1
      this.companionServer.broadcast({
        type: 'state',
        revision: this.syncRevision,
        current: current
          ? {
              id: current.id,
              task: current.task,
              duration: current.duration,
              elapsed: current.elapsed,
              realElapsed: this.engine.realActiveElapsed,
              status: current.status,
              detail: current.detail,
              usedDeveloperMode: Boolean(current.usedDeveloperMode || current.developerMode),
              developerMode: Boolean(current.developerMode),
              checks: current.checks.map((c) => ({
                id: c.id,
                elapsed: c.elapsed,
                activity: c.activity as FocusActivity,
                probability: c.probability,
                confidence: c.confidence,
                probabilities: c.probabilities as ProtocolFocusCheck['probabilities'],
                sampleDuration: c.sampleDuration,
                nudged: Boolean(c.nudged)
              }))
            }
          : undefined,
        history: [],
        developerMode: this.developerMode,
        takeoverActive: this.isTakeoverActive(),
        sentAt: Date.now()
      })
    }
  }
}

export const coordinator = new FocusCoordinator()
