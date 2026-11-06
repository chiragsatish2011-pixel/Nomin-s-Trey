import { app, dialog } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

let checkInFlight = false
let manualCheckRequested = false
let configured = false

function versionLabel(info: UpdateInfo): string {
  return `Version ${info.version}`
}

async function promptToDownload(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: `${versionLabel(info)} is ready for Trey.`,
    detail: 'Download it now? You can keep using Trey while the update downloads.',
    buttons: ['Download update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  })

  if (result.response === 0) {
    await autoUpdater.downloadUpdate()
  }
}

async function promptToInstall(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: `${versionLabel(info)} has downloaded.`,
    detail: 'Restart Trey now to install the update, or install it when you next close the app.',
    buttons: ['Restart and install', 'Install on exit'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  })

  if (result.response === 0) {
    autoUpdater.quitAndInstall()
  }
}

export function configureAutoUpdates(): void {
  if (configured || !app.isPackaged) return
  configured = true

  // Updating is user initiated: users choose when to download and install.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    void promptToDownload(info).catch((error: unknown) => {
      console.error('Could not show update download prompt:', error instanceof Error ? error.message : 'unknown error')
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    void promptToInstall(info).catch((error: unknown) => {
      console.error('Could not show update install prompt:', error instanceof Error ? error.message : 'unknown error')
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    if (!manualCheckRequested) return
    manualCheckRequested = false
    void dialog.showMessageBox({
      type: 'info',
      title: 'Trey is up to date',
      message: `You already have ${versionLabel(info)}.`,
      buttons: ['OK'],
      noLink: true
    })
  })

  autoUpdater.on('error', (error) => {
    console.error('Update check failed:', error.message)
    if (!manualCheckRequested) return
    manualCheckRequested = false
    void dialog.showMessageBox({
      type: 'error',
      title: 'Could not check for updates',
      message: 'Trey could not reach the update service.',
      detail: 'Check your internet connection and try again later.',
      buttons: ['OK'],
      noLink: true
    })
  })

  // Background auto-update check is only run on manual user trigger
  // to avoid network timeouts against unreleased GitHub repositories.
}

export async function checkForUpdates(manual = true): Promise<void> {
  if (!app.isPackaged || checkInFlight) return
  checkInFlight = true
  manualCheckRequested = manual

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    // The event above handles the user-facing message for a manual check.
    console.error('Update check could not start:', error instanceof Error ? error.message : 'unknown error')
  } finally {
    checkInFlight = false
  }
}
