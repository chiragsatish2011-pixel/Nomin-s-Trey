import { app, ipcMain, globalShortcut, powerMonitor, screen, shell } from 'electron'
import { appendFileSync } from 'fs'

process.on('uncaughtException', (err) => {
  try {
    appendFileSync('C:\\Temp\\trey_crash.log', `[UNCAUGHT] ${err?.stack || err}\n`)
  } catch (e) {
    console.error('Logging crash failed:', e)
  }
})

process.on('unhandledRejection', (reason) => {
  try {
    appendFileSync('C:\\Temp\\trey_crash.log', `[REJECTION] ${reason}\n`)
  } catch (e) {
    console.error('Logging rejection failed:', e)
  }
})
import { electronApp, optimizer } from '@electron-toolkit/utils'
import {
  createFaceWindow,
  createOverlayWindow,
  createDashboardWindow,
  createMicWindow,
  windows,
  getIsDashboardPinned,
  setIsDashboardPinned
} from './windows'
import { setupTray, updateTrayState, setExpression } from './tray'
import { coordinator } from './coordinator'
import { perceptionManager } from './perception'
import { windowsPushToTalk } from './platform/windows/WindowsPushToTalk'
import { windowsInputSimulation } from './platform/windows/WindowsInputSimulation'
import { TaskParser } from '@nomin/core'
import { loadSettings, saveSettings, AppSettings } from './store'
import { configureAutoUpdates } from './updates'
import { PairingManager } from './pairing/PairingManager.js'
import { CompanionServer } from './pairing/CompanionServer.js'
import { DiscoveryService } from './pairing/DiscoveryService.js'

let companionServer: CompanionServer | null = null
let discoveryService: DiscoveryService | null = null

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createDashboardWindow()
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.nomin.trey')
    await coordinator.init()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    const initialSettings = loadSettings()
    if (initialSettings.autoStartOnLogin !== undefined) {
      try {
        app.setLoginItemSettings({ openAtLogin: Boolean(initialSettings.autoStartOnLogin) })
      } catch {
        // Ignored in non-packaged dev
      }
    }

    // Initialize all 4 windows
    createFaceWindow()
    createOverlayWindow()
    if (!initialSettings.startMinimizedToTray) {
      createDashboardWindow()
    }
    createMicWindow()

    // Initialize Windows system tray
    setupTray()
    updateTrayState(coordinator)
    configureAutoUpdates()

    // Initialize Mobile Companion Pairing Server and Discovery Service
    const pairingManager = new PairingManager(59124)
    companionServer = new CompanionServer(pairingManager, {
      onStopRequested: (reason) => {
        if (coordinator.isTakeoverActive()) {
          coordinator.stopTakeover()
        } else {
          coordinator.pause(reason || 'Stopped from mobile companion')
        }
      },
      onTaskStartRequested: (task, durationMinutes, mode) => {
        if (mode === 'takeover') {
          coordinator.startTakeover(task)
        } else {
          coordinator.start(task, durationMinutes)
        }
      },
      onClientCountChanged: (count, names) => {
        if (windows.dashboard && !windows.dashboard.isDestroyed()) {
          windows.dashboard.webContents.send('companion:status', { count, names })
        }
      }
    })
    discoveryService = new DiscoveryService()

    coordinator.setCompanionServer(companionServer)
    await companionServer.start().catch((err) => console.warn('CompanionServer start failed:', err))
    discoveryService.start({ port: companionServer.getPort(), fingerprint: 'unpaired' })

    // Windows powerMonitor events: lock-screen & suspend pause the session
    // Unlocking NEVER auto-resumes (strict focus safety policy)
    // Global Safety Stop Hotkey: Ctrl+Alt+S stops takeover immediately (Requirement 7)
    globalShortcut.register('CommandOrControl+Alt+S', () => {
      coordinator.stopTakeover()
    })

    powerMonitor.on('lock-screen', () => {
      coordinator.stopTakeover()
      coordinator.pause('PC locked. Resume when you are ready.')
    })

    powerMonitor.on('suspend', () => {
      coordinator.stopTakeover()
      coordinator.pause('PC sleeping or suspended. Resume when you are ready.')
    })

    // IPC Handlers wired to Coordinator
    ipcMain.handle('focus:start', async (_event, { task, minutes }: { task: string; minutes: number }) => {
      return coordinator.start(task, minutes)
    })

    ipcMain.handle('focus:pause', async () => {
      return coordinator.pause()
    })

    ipcMain.handle('focus:resume', async () => {
      return coordinator.resume()
    })

    ipcMain.handle('focus:end', async () => {
      return coordinator.end()
    })

    ipcMain.handle('focus:developerMode', async (_event, enabled: boolean) => {
      return coordinator.setDeveloperMode(enabled)
    })

    ipcMain.handle('focus:testNudge', async () => {
      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.webContents.send('overlay:nudge', {
          message: 'Oi, back to the mission. This is your test nudge.'
        })
      }
      return 'Test nudge sent to overlay.'
    })

    // Autonomous Agent PC Takeover IPC Handlers
    ipcMain.handle('agent:startTakeover', async (_event, task: string) => {
      return coordinator.startTakeover(task)
    })

    ipcMain.handle('agent:stopTakeover', async () => {
      coordinator.stopTakeover()
      return true
    })

    ipcMain.handle('agent:isTakeoverActive', async () => {
      return coordinator.isTakeoverActive()
    })

    ipcMain.handle('focus:getHistory', async () => {
      return coordinator.getHistory()
    })

    ipcMain.handle('focus:clearHistory', async () => {
      await coordinator.clearHistory()
      return []
    })

    ipcMain.handle('settings:get', async () => {
      return loadSettings()
    })

    ipcMain.handle('settings:save', async (_event, newSettings: Partial<AppSettings>) => {
      const updated = saveSettings(newSettings)
      coordinator.applySettings(updated)
      if (newSettings.autoStartOnLogin !== undefined) {
        try {
          app.setLoginItemSettings({ openAtLogin: Boolean(newSettings.autoStartOnLogin) })
        } catch {
          // Ignored
        }
      }
      return updated
    })

    ipcMain.handle('ai:saveKey', async (_event, key: string) => {
      return coordinator.setApiKey(key)
    })

    ipcMain.handle('ai:hasKey', async () => {
      return coordinator.hasApiKey
    })

    ipcMain.handle('ai:getKeyMasked', async () => {
      return coordinator.getMaskedKey()
    })

    ipcMain.handle('ai:testKey', async (_event, candidateKey?: string) => {
      return coordinator.testApiKey(candidateKey)
    })

    ipcMain.handle('ai:removeKey', async () => {
      await coordinator.removeApiKey()
      return true
    })

    ipcMain.handle('ai:listModels', async () => {
      return coordinator.visionProvider.listVisionModels()
    })

    ipcMain.handle('ai:getGovernorStatus', async () => {
      return coordinator.visionProvider.governor.getStatus()
    })

    ipcMain.handle('perception:captureNow', async () => {
      const snap = await perceptionManager.snapshot()
      const base64 = Buffer.from(snap.capture.jpeg).toString('base64')
      return {
        imageDataUrl: `data:image/jpeg;base64,${base64}`,
        lines: snap.ocr.lines.map((l) => l.line),
        app: snap.app,
        idleSeconds: snap.idleSeconds
      }
    })

    // Window locking & multi-window control handlers
    ipcMain.handle('window:setAlwaysOnTop', async (_event, pinned: boolean) => {
      setIsDashboardPinned(pinned)
      return pinned
    })

    ipcMain.handle('window:isAlwaysOnTop', async () => {
      return getIsDashboardPinned()
    })

    ipcMain.handle('window:toggleFloatingBuddy', async (_event, show: boolean) => {
      if (show) {
        if (!windows.face || windows.face.isDestroyed()) {
          createFaceWindow()
        } else {
          windows.face.show()
        }
      } else {
        if (windows.face && !windows.face.isDestroyed()) {
          windows.face.hide()
        }
      }
      return show
    })

    ipcMain.handle('window:isFloatingBuddyVisible', async () => {
      return Boolean(windows.face && !windows.face.isDestroyed() && windows.face.isVisible())
    })

    ipcMain.handle('face:moveBy', async (_event, { dx, dy }: { dx: number; dy: number }) => {
      const face = windows.face
      if (!face || face.isDestroyed() || !Number.isFinite(dx) || !Number.isFinite(dy)) return false
      const bounds = face.getBounds()
      const display = screen.getDisplayMatching(bounds)
      const area = display.workArea
      face.setPosition(
        Math.min(area.x + area.width - 40, Math.max(area.x - bounds.width + 40, bounds.x + dx)),
        Math.min(area.y + area.height - 40, Math.max(area.y - bounds.height + 40, bounds.y + dy))
      )
      return true
    })

    ipcMain.handle('face:resize', async (_event, { deltaFactor }: { deltaFactor: number }) => {
      const face = windows.face
      if (!face || face.isDestroyed() || !Number.isFinite(deltaFactor) || deltaFactor <= 0) return null
      const bounds = face.getBounds()
      const width = Math.min(520, Math.max(120, Math.round(bounds.width * deltaFactor)))
      const height = Math.min(520, Math.max(120, Math.round(bounds.height * deltaFactor)))
      face.setBounds({ x: bounds.x, y: bounds.y, width, height })
      return { width, height }
    })

    ipcMain.handle('face:resetSize', async () => {
      const face = windows.face
      if (face && !face.isDestroyed()) face.setSize(260, 220)
    })

    ipcMain.handle('window:minimize', async () => {
      if (windows.dashboard && !windows.dashboard.isDestroyed()) {
        windows.dashboard.minimize()
      }
    })

    ipcMain.handle('window:close', async () => {
      if (windows.dashboard && !windows.dashboard.isDestroyed()) {
        windows.dashboard.close()
      }
    })

    ipcMain.handle('research:query', async (_event, question: string) => {
      const trimmed = (question || '').trim()

      // Point to text on screen
      if (/^(point to|find|where is|point at|show me)\s+(.+)/i.test(trimmed)) {
        await coordinator.pointAtTarget(trimmed)
        return {
          question,
          title: 'Pointing to Screen Target',
          paragraphs: [`Trey is pointing at "${trimmed}".`],
          sources: [],
          plainText: `Pointing to ${trimmed}`,
          takeaway: `Pointed at "${trimmed}" on your screen!`
        }
      }

      // Close / terminate application command
      const closeMatch = trimmed.match(/^(close|quit|kill|exit|shut down|terminate|stop)\s+(.+)/i)
      if (closeMatch) {
        const res = await coordinator.closeApp(closeMatch[2])
        return {
          question,
          title: res.success ? `Closed ${closeMatch[2]}` : `Could Not Close ${closeMatch[2]}`,
          paragraphs: [res.message],
          sources: [],
          plainText: res.message,
          takeaway: res.message
        }
      }

      // App / website launcher
      const openMatch = trimmed.match(/^(open|launch|go to)\s+(.+)/i)
      if (openMatch) {
        const target = openMatch[2].toLowerCase().trim()
        let url = ''
        if (target.includes('chatgpt') || target.includes('gpt')) {
          url = 'https://chatgpt.com'
        } else if (target.includes('twitter') || target === 'x' || target.includes('x.com')) {
          url = 'https://x.com'
        } else if (target.includes('youtube')) {
          url = 'https://youtube.com'
        } else if (target.includes('github')) {
          url = 'https://github.com'
        } else if (target.startsWith('http://') || target.startsWith('https://')) {
          url = target
        } else if (target.includes('.')) {
          url = `https://${target}`
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(target)}`
        }
        await shell.openExternal(url)
        setExpression('happy')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: `Opening ${openMatch[2]} for you!`
          })
        }
        return {
          question,
          title: `Opened ${openMatch[2]}`,
          paragraphs: [`Trey opened ${url} in your default browser.`],
          sources: [{ title: openMatch[2], url }],
          plainText: `Opened ${url}`,
          takeaway: `Opened ${openMatch[2]}!`
        }
      }

      // Sleep mood
      if (/^(go to sleep|sleep|take a nap|rest)/i.test(trimmed)) {
        setExpression('sleepy')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: 'Goodnight! Going to sleep now.'
          })
        }
        return {
          question,
          title: 'Trey is Resting',
          paragraphs: ['Trey is taking a quick nap.'],
          sources: [],
          plainText: 'Trey is sleeping',
          takeaway: 'Goodnight! Going to sleep now.'
        }
      }

      return coordinator.performResearch(question)
    })

    ipcMain.on('overlay:setIgnoreMouseEvents', (_event, { ignore, forward }: { ignore: boolean; forward?: boolean }) => {
      if (windows.overlay && !windows.overlay.isDestroyed()) {
        windows.overlay.setIgnoreMouseEvents(ignore, { forward: forward ?? true })
      }
    })

    ipcMain.handle('shell:openExternal', async (_event, url: string) => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        await shell.openExternal(url)
      }
    })

    // Handle voice text commands & agentic requests
    const handleVoiceText = async (rawText: string) => {
      setExpression('idle')

      if (!rawText || !rawText.trim()) {
        return
      }

      const trimmed = rawText.trim()

      // Point to text on screen
      if (/^(point to|find|where is|point at|show me)\s+(.+)/i.test(trimmed)) {
        await coordinator.pointAtTarget(trimmed)
        return
      }

      // Close / terminate application command
      const closeMatch = trimmed.match(/^(close|quit|kill|exit|shut down|terminate|stop)\s+(.+)/i)
      if (closeMatch) {
        await coordinator.closeApp(closeMatch[2])
        return
      }

      // App / website launcher
      const openMatch = trimmed.match(/^(open|launch|go to)\s+(.+)/i)
      if (openMatch) {
        const target = openMatch[2].toLowerCase().trim()
        let url = ''
        if (target.includes('chatgpt') || target.includes('gpt')) {
          url = 'https://chatgpt.com'
        } else if (target.includes('twitter') || target === 'x' || target.includes('x.com')) {
          url = 'https://x.com'
        } else if (target.includes('youtube')) {
          url = 'https://youtube.com'
        } else if (target.includes('github')) {
          url = 'https://github.com'
        } else if (target.startsWith('http://') || target.startsWith('https://')) {
          url = target
        } else if (target.includes('.')) {
          url = `https://${target}`
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(target)}`
        }
        await shell.openExternal(url)
        setExpression('happy')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: `Opening ${openMatch[2]} for you!`
          })
        }
        return
      }

      // Sleep mood
      if (/^(go to sleep|sleep|take a nap|rest)/i.test(trimmed)) {
        setExpression('sleepy')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: 'Goodnight! Going to sleep now.'
          })
        }
        return
      }

      // Wake mood
      if (/^(wake up|good morning|hello|hey|yo)/i.test(trimmed)) {
        setExpression('happy')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: "I'm awake and ready to help!"
          })
        }
        return
      }

      const isResearchQuery =
        /^(research|look up|search for|what is|how do|why is|explain|tell me|who is|who are you|who made you|who made nomin|can you find|where is|describe|summary of)\b/i.test(
          trimmed
        ) ||
        trimmed.toLowerCase().includes('research') ||
        trimmed.endsWith('?')

      if (isResearchQuery) {
        void coordinator.performResearch(trimmed)
        return
      }

      const parsed = TaskParser.parse(trimmed)

      if (parsed.isCommand) {
        if (parsed.command === 'pause') {
          coordinator.pause('Voice command')
        } else if (parsed.command === 'resume') {
          coordinator.resume()
        } else if (parsed.command === 'end') {
          coordinator.end()
        }
        return
      }

      if (parsed.task) {
        coordinator.start(parsed.task, parsed.minutes ?? 25)
      } else {
        void coordinator.performResearch(trimmed)
      }
    }

    // Emergency Pause / Resume handler (Hotkey: K)
    const handleEmergencyToggle = () => {
      const session = coordinator.session
      if (session && session.status === 'running') {
        coordinator.pause('Emergency shortcut (K)')
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', { message: 'Focus paused (K).' })
        }
      } else if (session && session.status === 'paused') {
        coordinator.resume()
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', { message: 'Focus resumed (K).' })
        }
      }
    }

    // Initialize Push-to-Talk (Hotkey: J for speaking, K for emergency)
    windowsPushToTalk.start({
      onKeyDown: () => {
        setExpression('listening')
        if (windows.mic && !windows.mic.isDestroyed()) {
          windows.mic.webContents.send('mic:start')
        }
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: '🎤 Listening... Release J when done.'
          })
        }
      },
      onKeyUp: () => {
        setExpression('thinking')
        if (windows.mic && !windows.mic.isDestroyed()) {
          windows.mic.webContents.send('mic:stop')
        }
      },
      onEmergency: handleEmergencyToggle
    }).catch((err) => {
      console.warn('Push-to-talk start warning:', err)
    })

    // Handle voice transcriptions (text from Web Speech API)
    ipcMain.on('mic:transcription', async (_event, { text }: { text: string }) => {
      await handleVoiceText(text)
    })

    // Handle audio buffer from MediaRecorder (Universal Whisper transcription)
    ipcMain.on(
      'mic:audio-buffer',
      async (
        _event,
        {
          buffer,
          mimeType,
          webText
        }: {
          buffer?: ArrayBuffer
          mimeType?: string
          webText?: string
        }
      ) => {
        let text = (webText || '').trim()

        if (!text && buffer && coordinator.visionProvider.client.hasApiKey()) {
          try {
            const blob = new Blob([buffer], { type: mimeType || 'audio/webm' })
            const res = await coordinator.visionProvider.client.transcribeAudio(blob)
            text = (res.text || '').trim()
          } catch (err) {
            console.warn('Audio transcription error:', err)
          }
        }

        if (text) {
          await handleVoiceText(text)
        } else {
          setExpression('idle')
        }
      }
    )

    // Pairing & Companion IPC handlers
    ipcMain.handle('pairing:startSession', async () => {
      const port = companionServer ? companionServer.getPort() : 59124
      const session = await pairingManager.startPairingSession(port)
      discoveryService?.updateFingerprint(session.fingerprint)
      return session
    })

    ipcMain.handle('pairing:getPairedDevices', async () => {
      return pairingManager.getPairedDevices()
    })

    ipcMain.handle('pairing:revokeDevice', async (_event, id: string) => {
      const revoked = pairingManager.revokeDevice(id)
      if (revoked && companionServer) {
        companionServer.disconnectDevice(id)
      }
      return revoked
    })

    ipcMain.handle('pairing:getStatus', async () => {
      return {
        port: companionServer ? companionServer.getPort() : 59124,
        clientCount: companionServer ? companionServer.getConnectedClientsCount() : 0,
        clientNames: companionServer ? companionServer.getConnectedClientNames() : []
      }
    })

    app.on('activate', () => {
      if (!windows.dashboard || windows.dashboard.isDestroyed()) {
        createDashboardWindow()
      }
    })
  })

  function cleanShutdown(): void {
    try {
      if (coordinator.session && coordinator.session.status !== 'ended') {
        coordinator.end()
      }
    } catch (err) {
      console.error('Clean shutdown error:', err)
    }
  }

  app.on('before-quit', () => {
    cleanShutdown()
  })

  process.on('SIGINT', () => {
    cleanShutdown()
    app.quit()
  })

  process.on('SIGTERM', () => {
    cleanShutdown()
    app.quit()
  })

  app.on('will-quit', () => {
    coordinator.stopTakeover()
    companionServer?.stop()
    discoveryService?.stop()
    windowsInputSimulation.dispose()
    windowsPushToTalk.stop().catch(() => {})
    globalShortcut.unregisterAll()
  })

  app.on('window-all-closed', () => {
    // Keep app alive in Windows system tray
  })
}
