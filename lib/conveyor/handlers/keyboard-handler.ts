import { BrowserWindow, globalShortcut, app } from 'electron'
import { handle } from '@/lib/main/shared'

let cleanupRegistered = false

const normalizeKey = (key: string | null): string | null => {
  if (!key) return null
  const trimmed = key.trim()
  if (!trimmed) return null
  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }
  return trimmed
}

export const registerKeyboardHandlers = (window: BrowserWindow) => {
  if (!cleanupRegistered) {
    app.on('will-quit', () => {
      globalShortcut.unregisterAll()
    })
    cleanupRegistered = true
  }

  let registeredKey: string | null = null

  const register = (key: string | null) => {
    if (registeredKey) {
      globalShortcut.unregister(registeredKey)
      registeredKey = null
    }

    const normalized = normalizeKey(key)
    if (!normalized) {
      return { success: true, key: null }
    }

    const success = globalShortcut.register(normalized, () => {
      if (!window.isDestroyed()) {
        console.log('[keyboard] shortcut fired', normalized)
        window.webContents.send('keyboard-shortcut', { key: normalized })
      }
    })

    if (!success) {
      console.warn('[keyboard] Failed to register global shortcut:', normalized)
      globalShortcut.unregister(normalized)
      return { success: false, key: null }
    }

    registeredKey = normalized
    return { success: true, key: normalized }
  }

  handle('keyboard-register-binding', (key: string | null) => register(key))

  handle('keyboard-unregister-all', () => {
    if (registeredKey) {
      globalShortcut.unregister(registeredKey)
      registeredKey = null
    }
    return true
  })

  window.on('closed', () => {
    if (registeredKey) {
      globalShortcut.unregister(registeredKey)
      registeredKey = null
    }
  })
}

