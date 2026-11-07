import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { loadSettings, saveSettings } from './store'

export interface WindowRegistry {
  face?: BrowserWindow
  overlay?: BrowserWindow
  dashboard?: BrowserWindow
  mic?: BrowserWindow
}

export const windows: WindowRegistry = {}

let cursorInterval: NodeJS.Timeout | null = null
let lastCursor = { x: -1, y: -1 }
let isDashboardPinned = true
const FACE_MIN_SIZE = 120
const FACE_MAX_SIZE = 520

export function getIsDashboardPinned(): boolean {
  return isDashboardPinned
}

export function setIsDashboardPinned(pinned: boolean): void {
  isDashboardPinned = pinned
  if (windows.dashboard && !windows.dashboard.isDestroyed()) {
    try {
      if (pinned) {
        windows.dashboard.setAlwaysOnTop(true, 'screen-saver', 1)
        windows.dashboard.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      } else {
        windows.dashboard.setAlwaysOnTop(false)
      }
    } catch (err) {
      console.warn('Could not set dashboard alwaysOnTop:', err)
    }
  }
}

// Watchdog to guarantee windows never vanish or lose topmost z-order on Windows
setInterval(() => {
  if (windows.face && !windows.face.isDestroyed() && windows.face.isVisible()) {
    try {
      windows.face.setAlwaysOnTop(true, 'screen-saver', 1)
    } catch {
      // ignore
    }
  }
  if (windows.dashboard && !windows.dashboard.isDestroyed() && isDashboardPinned) {
    try {
      windows.dashboard.setAlwaysOnTop(true, 'screen-saver', 1)
    } catch {
      // ignore
    }
  }
}, 1000)

export function startCursorTracking(): void {
  if (cursorInterval) return

  cursorInterval = setInterval(() => {
    const current = screen.getCursorScreenPoint()
    // Optimization: only emit if mouse moved
    if (current.x !== lastCursor.x || current.y !== lastCursor.y) {
      lastCursor = current

      // Send to floating face window
      if (windows.face && !windows.face.isDestroyed() && windows.face.isVisible()) {
        const faceBounds = windows.face.getBounds()
        windows.face.webContents.send('cursor:moved', {
          x: current.x,
          y: current.y,
          faceX: faceBounds.x,
        faceY: faceBounds.y,
        width: faceBounds.width,
        height: faceBounds.height
        })
      }

      // Send to main Trey window
      if (windows.dashboard && !windows.dashboard.isDestroyed() && windows.dashboard.isVisible()) {
        const dashBounds = windows.dashboard.getBounds()
        windows.dashboard.webContents.send('cursor:moved', {
          x: current.x,
          y: current.y,
          faceX: dashBounds.x,
          faceY: dashBounds.y,
          width: dashBounds.width,
          height: dashBounds.height
        })
      }
    }
  }, 16) // ~60fps smooth tracking
}

export function stopCursorTracking(): void {
  if (cursorInterval) {
    clearInterval(cursorInterval)
    cursorInterval = null
  }
}

export function createFaceWindow(): BrowserWindow {
  if (windows.face && !windows.face.isDestroyed()) {
    windows.face.show()
    return windows.face
  }

  const settings = loadSettings()
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const defaultX = width - 260
  const defaultY = height - 220

  const x = settings.facePosition?.x ?? defaultX
  const y = settings.facePosition?.y ?? defaultY
  const faceWidth = settings.faceSize?.width ?? 260
  const faceHeight = settings.faceSize?.height ?? 220

  const win = new BrowserWindow({
    width: faceWidth,
    height: faceHeight,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: FACE_MIN_SIZE,
    minHeight: FACE_MIN_SIZE,
    maxWidth: FACE_MAX_SIZE,
    maxHeight: FACE_MAX_SIZE,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/face.js'),
      backgroundThrottling: false,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Prevent window from disappearing or losing z-order on Windows
  try {
    win.setAlwaysOnTop(true, 'screen-saver', 1)
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  } catch {
    // Fallback
  }

  win.on('blur', () => {
    try {
      win.setAlwaysOnTop(true, 'screen-saver', 1)
    } catch {
      // ignore
    }
  })

  // Prevent window from appearing in screen captures
  try {
    win.setContentProtection(true)
  } catch {
    // Fallback
  }

  // Save position on move across restarts
  win.on('moved', () => {
    const [nx, ny] = win.getPosition()
    saveSettings({ facePosition: { x: nx, y: ny } })
  })

  win.on('resize', () => {
    const { width, height } = win.getBounds()
    saveSettings({ faceSize: { width, height } })
  })

  win.on('ready-to-show', () => {
    win.show()
    startCursorTracking()
  })

  win.on('closed', () => {
    windows.face = undefined
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/face/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/face/index.html'))
  }

  windows.face = win
  return win
}

export function createOverlayWindow(): BrowserWindow {
  if (windows.overlay && !windows.overlay.isDestroyed()) {
    return windows.overlay
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.js'),
      backgroundThrottling: false,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver', 2)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })

  try {
    win.setContentProtection(true)
  } catch {
    // Handled
  }

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    windows.overlay = undefined
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  windows.overlay = win
  return win
}

export function createDashboardWindow(): BrowserWindow {
  if (windows.dashboard && !windows.dashboard.isDestroyed()) {
    windows.dashboard.show()
    windows.dashboard.focus()
    return windows.dashboard
  }

  const win = new BrowserWindow({
    title: 'Trey',
    width: 960,
    height: 740,
    minWidth: 680,
    minHeight: 580,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/dashboard.js'),
      backgroundThrottling: false,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Lock above all apps if pinned
  if (isDashboardPinned) {
    try {
      win.setAlwaysOnTop(true, 'screen-saver', 1)
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    } catch {
      // ignore
    }
  }

  win.on('blur', () => {
    if (isDashboardPinned && !win.isDestroyed()) {
      try {
        win.setAlwaysOnTop(true, 'screen-saver', 1)
      } catch {
        // ignore
      }
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    startCursorTracking()
  })

  win.on('closed', () => {
    windows.dashboard = undefined
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/dashboard/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/dashboard/index.html'))
  }

  windows.dashboard = win
  return win
}

export function createMicWindow(): BrowserWindow {
  if (windows.mic && !windows.mic.isDestroyed()) {
    return windows.mic
  }

  const win = new BrowserWindow({
    width: 200,
    height: 200,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/mic.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('closed', () => {
    windows.mic = undefined
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/mic/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/mic/index.html'))
  }

  windows.mic = win
  return win
}
