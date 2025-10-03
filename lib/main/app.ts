import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerKeyboardHandlers } from '@/lib/conveyor/handlers/keyboard-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'

export function createAppWindow(): void {
  // Ensure static assets resolve correctly across environments
  registerResourcesProtocol()

  // Create the main window with a narrow default width so it can stay docked
  const mainWindow = new BrowserWindow({
    width: 60,
    height: 540,
    minWidth: 60,
    minHeight: 300,
    show: false,
    backgroundColor: '#0f172a',
    icon: appIcon,
    frame: false,
    titleBarStyle: 'hiddenInset',
    title: '燕云十六声指挥工具',
    maximizable: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Wire IPC handlers that depend on the window instance
  registerWindowHandlers(mainWindow)
  registerKeyboardHandlers(mainWindow)
  registerAppHandlers(app)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

}
