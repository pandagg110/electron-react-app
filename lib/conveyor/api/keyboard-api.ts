import type { IpcRendererEvent } from 'electron'
import { ConveyorApi } from '@/lib/preload/shared'

export interface KeyboardShortcutEvent {
  key: string
}

export interface RegisterBindingResult {
  success: boolean
  key: string | null
  error?: string
}

export class KeyboardApi extends ConveyorApi {
  registerBinding = (key: string | null): Promise<RegisterBindingResult> =>
    this.invoke('keyboard-register-binding', key)

  unregisterAll = (): Promise<{ success: boolean }> => this.invoke('keyboard-unregister-all')

  onShortcut = (callback: (payload: KeyboardShortcutEvent) => void): (() => void) => {
    const channel = 'keyboard-shortcut'
    const handler = (_event: IpcRendererEvent, payload: KeyboardShortcutEvent) => {
      callback(payload)
    }

    this.renderer.on(channel, handler)

    return () => {
      this.renderer.removeListener(channel, handler)
    }
  }
}
