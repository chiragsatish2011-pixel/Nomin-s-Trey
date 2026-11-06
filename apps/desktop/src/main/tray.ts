import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { createDashboardWindow, windows } from './windows'
import { saveSettings } from './store'
import { checkForUpdates } from './updates'
import type { FocusCoordinator } from './coordinator'

let tray: Tray | null = null
let currentCoordinator: FocusCoordinator | null = null

function getTrayIcon(): Electron.NativeImage {
  const iconCandidates = [
    join(__dirname, '../../resources/icon.png'),
    join(process.resourcesPath || '', 'icon.png'),
    join(process.resourcesPath || '', 'app.asar/resources/icon.png')
  ]
  for (const p of iconCandidates) {
    try {
      if (existsSync(p)) {
        const img = nativeImage.createFromPath(p)
        if (!img.isEmpty()) {
          return img.resize({ width: 16, height: 16 })
        }
      }
    } catch {
      // Continue
    }
  }
  return createDefaultTrayIcon()
}

function createDefaultTrayIcon(): Electron.NativeImage {
  const size = 16
  const buffer = Buffer.alloc(size * size * 4)
  const radius = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - radius + 0.5
      const dy = y - radius + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius - 0.5) {
        buffer[idx] = 0x42
        buffer[idx + 1] = 0x54
        buffer[idx + 2] = 0xD6
        buffer[idx + 3] = 0xFF
      } else {
        buffer[idx + 3] = 0x00
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size })
}

export function setExpression(expr: string): void {
  saveSettings({ expression: expr })
  if (windows.face && !windows.face.isDestroyed()) {
    windows.face.webContents.send('face:expression', expr)
  }
}

export function updateTrayState(coordinator: FocusCoordinator): void {
  currentCoordinator = coordinator
  if (!tray) return

  const session = coordinator.session
  const isRunning = session?.status === 'running'
  const isPaused = session?.status === 'paused'

  const expressions = ['idle', 'listening', 'thinking', 'nudging', 'paused', 'sleeping']

  const statusLabel = isRunning
    ? `Trey by The Nomin Co · "${session?.task.slice(0, 24)}"`
    : isPaused
    ? 'Trey · Focus Paused (Press K to resume)'
    : 'Trey by The Nomin Company · Ready'

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: statusLabel, enabled: false },
    { label: 'Created by The Nomin Company (Chirag S)', enabled: false },
    { type: 'separator' }
  ]

  if (isRunning) {
    template.push(
      {
        label: 'Pause Focus (Press K)',
        click: () => coordinator.pause()
      },
      {
        label: 'End Focus',
        click: () => coordinator.end()
      }
    )
  } else if (isPaused) {
    template.push(
      {
        label: 'Resume Focus (Press K)',
        click: () => coordinator.resume()
      },
      {
        label: 'End Focus',
        click: () => coordinator.end()
      }
    )
  } else {
    template.push({
      label: 'Start 30m Focus',
      click: () => coordinator.start('Quick focus session', 30)
    })
  }

  template.push(
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => createDashboardWindow()
    },
    {
      label: 'Toggle Face Widget',
      click: () => {
        if (windows.face && !windows.face.isDestroyed()) {
          if (windows.face.isVisible()) {
            windows.face.hide()
          } else {
            windows.face.show()
          }
        }
      }
    },
    {
      label: 'Developer Mode (4x Clock)',
      type: 'checkbox',
      checked: coordinator.isDeveloperMode,
      click: (item) => {
        coordinator.setDeveloperMode(item.checked)
      }
    },
    {
      label: 'Expression (Debug)',
      submenu: expressions.map((expr) => ({
        label: expr.charAt(0).toUpperCase() + expr.slice(1),
        type: 'radio',
        click: () => setExpression(expr)
      }))
    },
    {
      label: 'Test a Nudge',
      click: () => {
        if (windows.overlay && !windows.overlay.isDestroyed()) {
          windows.overlay.webContents.send('overlay:nudge', {
            message: 'Oi, back to the mission. This is your test nudge.'
          })
        }
      }
    },
    {
      label: 'Check for Updates…',
      click: () => {
        void checkForUpdates()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Trey',
      click: () => app.quit()
    }
  )

  tray.setContextMenu(Menu.buildFromTemplate(template))
}

export function setupTray(): Tray | null {
  try {
    const icon = getTrayIcon()
    tray = new Tray(icon)
    tray.setToolTip('Trey · By The Nomin Company (Chirag S)')

    if (currentCoordinator) {
      updateTrayState(currentCoordinator)
    }

    tray.on('double-click', () => {
      createDashboardWindow()
    })

    tray.on('click', () => {
      createDashboardWindow()
    })

    return tray
  } catch (err) {
    console.warn('Tray setup skipped:', err)
    return null
  }
}
