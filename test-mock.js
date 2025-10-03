const Module = require('module')
const originalLoad = Module._load
const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (...args) => {
      console.log('[mock] webContents.send', JSON.stringify(args))
    }
  },
  on: (event, handler) => {
    if (event === 'closed') {
      mockWindow._onClosed = handler
    }
  }
}
const mockElectron = {
  globalShortcut: {
    register: (key, handler) => {
      console.log('[mock] register', key)
      mockElectron.globalShortcut._handler = handler
      return true
    },
    unregister: (key) => console.log('[mock] unregister', key),
    unregisterAll: () => console.log('[mock] unregisterAll')
  },
  app: {
    on: (event, handler) => {
      console.log('[mock] app.on', event)
      if (event === 'will-quit') {
        mockElectron.app._onWillQuit = handler
      }
    }
  }
}
Module._load = function(request, parent, isMain) {
  if (request === 'electron') {
    return mockElectron
  }
  return originalLoad(request, parent, isMain)
}
const { registerKeyboardHandlers } = require('./lib/conveyor/handlers/keyboard-handler')
registerKeyboardHandlers(mockWindow)
if (mockElectron.globalShortcut._handler) {
  mockElectron.globalShortcut._handler()
}
