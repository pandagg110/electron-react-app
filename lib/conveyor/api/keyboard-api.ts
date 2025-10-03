import type { IpcRendererEvent } from 'electron'
import { ConveyorApi } from '@/lib/preload/shared'

interface KeyboardShortcutPayload {
  key: string
}

export class KeyboardApi extends ConveyorApi {
  registerBinding = (key: string | null) => this.invoke('keyboard-register-binding', key)
  unregisterAll = () => this.invoke('keyboard-unregister-all')

  onShortcut(listener: (payload: KeyboardShortcutPayload) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: KeyboardShortcutPayload) => {
      listener(payload)
    }

    this.renderer.on('keyboard-shortcut', handler)
    return () => {
      this.renderer.removeListener('keyboard-shortcut', handler)
    }
  }
}

