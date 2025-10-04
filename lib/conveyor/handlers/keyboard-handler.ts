import { app, type BrowserWindow } from 'electron'
import {
  GlobalKeyboardListener,
  type IGlobalKeyDownMap,
  type IGlobalKeyEvent,
} from 'node-global-key-listener'
import { handle } from '@/lib/main/shared'

const SHORTCUT_CHANNEL = 'keyboard-shortcut'

const KEY_ALIASES: Record<string, string> = {
  ' ': 'SPACE',
  SPACE: 'SPACE',
  Space: 'SPACE',
  Spacebar: 'SPACE',
  RETURN: 'ENTER',
  Return: 'ENTER',
}

const normalizeBinding = (value: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const alias = KEY_ALIASES[trimmed] ?? KEY_ALIASES[trimmed.toUpperCase()]
  if (alias) return alias
  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }
  return trimmed.toUpperCase()
}

const normalizeEventKey = (event: IGlobalKeyEvent): string | null => {
  if (!event.name) return null
  return normalizeBinding(event.name)
}

let keyboardListener: GlobalKeyboardListener | null = null
let keyboardListenerCallback:
  | ((event: IGlobalKeyEvent, down: IGlobalKeyDownMap) => boolean | void)
  | null = null
let activeBinding: string | null = null
let activeWindow: BrowserWindow | null = null
let handlersRegistered = false
let initError: Error | null = null

const disposeKeyboard = () => {
  if (keyboardListener && keyboardListenerCallback) {
    keyboardListener.removeListener(keyboardListenerCallback)
    keyboardListener.kill()
  }
  keyboardListener = null
  keyboardListenerCallback = null
  activeBinding = null
}

const ensureListener = () => {
  if (!keyboardListener) {
    try {
      keyboardListener = new GlobalKeyboardListener()
      initError = null
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error))
      keyboardListener = null
      console.error('[keyboard] failed to create global listener', initError)
      return
    }
  }

  if (keyboardListener && !keyboardListenerCallback) {
    keyboardListenerCallback = (event) => {
      if (!activeBinding) return undefined
      if (event.state !== 'DOWN') return undefined
      const pressed = normalizeEventKey(event)
      if (!pressed || pressed !== activeBinding) return undefined
      const target = activeWindow && !activeWindow.isDestroyed() ? activeWindow : null
      if (!target) return undefined
      target.webContents.send(SHORTCUT_CHANNEL, { key: activeBinding })
      return undefined
    }

    keyboardListener
      .addListener(keyboardListenerCallback)
      .catch((error) => console.error('[keyboard] failed to add listener', error))
  }
}

export const registerKeyboardHandlers = (window: BrowserWindow) => {
  activeWindow = window

  ensureListener()

  if (!handlersRegistered) {
    handlersRegistered = true

    handle('keyboard-register-binding', async (binding) => {
      if (binding === null) {
        activeBinding = null
        return { success: true, key: null }
      }

      if (!keyboardListener) {
        return {
          success: false,
          key: null,
          error: initError?.message ?? 'global-listener-unavailable',
        }
      }

      const normalized = normalizeBinding(binding)
      if (!normalized) {
        return { success: false, key: null, error: 'invalid-key' }
      }

      activeBinding = normalized
      return { success: true, key: normalized }
    })

    handle('keyboard-unregister-all', async () => {
      activeBinding = null
      return { success: true }
    })

    app.on('will-quit', () => {
      disposeKeyboard()
    })
  }

  window.on('closed', () => {
    if (activeWindow === window) {
      activeWindow = null
      disposeKeyboard()
    }
  })
}
