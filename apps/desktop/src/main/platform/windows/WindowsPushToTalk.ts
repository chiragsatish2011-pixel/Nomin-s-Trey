import { globalShortcut } from 'electron'
import type { PushToTalk, PushToTalkListener } from '@nomin/core'

export interface ExtendedPushToTalkListener extends PushToTalkListener {
  onEmergency?: () => void
}

export class WindowsPushToTalk implements PushToTalk {
  private listener: ExtendedPushToTalkListener | null = null
  private uIOhook: unknown = null
  private isHolding = false
  private ctrlPressed = false
  private altPressed = false
  private isUsingFallback = false
  private isToggleActive = false

  async start(listener: ExtendedPushToTalkListener): Promise<void> {
    this.listener = listener

    try {
      // Dynamic import of uiohook-napi for low-level global key interception
      const uiohookModule = await import('uiohook-napi')
      const { uIOhook, UiohookKey } = uiohookModule

      this.uIOhook = uIOhook

      uIOhook.on('keydown', (e: { keycode: number }) => {
        if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
          this.ctrlPressed = true
        }
        if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
          this.altPressed = true
        }

        // Key "J" held with Ctrl or Alt -> Push-to-Talk (Hold J to speak)
        if (e.keycode === UiohookKey.J && (this.ctrlPressed || this.altPressed)) {
          if (!this.isHolding) {
            this.isHolding = true
            this.listener?.onKeyDown()
          }
        }

        // Key "K" pressed with Ctrl or Alt -> Emergency Pause / Resume
        if (e.keycode === UiohookKey.K && (this.ctrlPressed || this.altPressed)) {
          this.listener?.onEmergency?.()
        }
      })

      uIOhook.on('keyup', (e: { keycode: number }) => {
        if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
          this.ctrlPressed = false
        }
        if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
          this.altPressed = false
        }

        if (this.isHolding) {
          if (
            e.keycode === UiohookKey.J ||
            e.keycode === UiohookKey.Ctrl ||
            e.keycode === UiohookKey.CtrlRight ||
            e.keycode === UiohookKey.Alt ||
            e.keycode === UiohookKey.AltRight
          ) {
            this.isHolding = false
            this.listener?.onKeyUp()
          }
        }
      })

      uIOhook.start()
    } catch {
      // Handled - will use globalShortcut
    }

    // Register global shortcuts: Ctrl+J and Alt+J for talk, Ctrl+K and Alt+K for emergency
    this.registerGlobalAccelerators()
  }

  private registerGlobalAccelerators(): void {
    this.isUsingFallback = true

    // Push-to-talk talk toggles / hotkeys: Ctrl+J and Alt+J
    const talkShortcuts = ['CommandOrControl+J', 'Alt+J']
    for (const shortcut of talkShortcuts) {
      try {
        globalShortcut.register(shortcut, () => {
          if (!this.isToggleActive) {
            this.isToggleActive = true
            this.listener?.onKeyDown()
          } else {
            this.isToggleActive = false
            this.listener?.onKeyUp()
          }
        })
      } catch (err) {
        console.warn(`Shortcut ${shortcut} registration failed:`, err)
      }
    }

    // Emergency pause shortcuts: Ctrl+K and Alt+K
    const emergencyShortcuts = ['CommandOrControl+K', 'Alt+K']
    for (const shortcut of emergencyShortcuts) {
      try {
        globalShortcut.register(shortcut, () => {
          this.listener?.onEmergency?.()
        })
      } catch (err) {
        console.warn(`Emergency shortcut ${shortcut} registration failed:`, err)
      }
    }
  }

  async stop(): Promise<void> {
    if (this.uIOhook) {
      try {
        ;(this.uIOhook as { stop: () => void }).stop()
      } catch {
        // Handled
      }
      this.uIOhook = null
    }

    if (this.isUsingFallback) {
      globalShortcut.unregister('CommandOrControl+J')
      globalShortcut.unregister('Alt+J')
      globalShortcut.unregister('CommandOrControl+K')
      globalShortcut.unregister('Alt+K')
    }

    this.listener = null
    this.isHolding = false
    this.isToggleActive = false
  }
}

export const windowsPushToTalk = new WindowsPushToTalk()
