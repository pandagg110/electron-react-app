import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { KeyboardApi } from './keyboard-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  keyboard: new KeyboardApi(electronAPI),
}

export type ConveyorApi = typeof conveyor

