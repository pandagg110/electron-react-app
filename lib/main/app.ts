import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import appIcon from '@/resources/build/icon.png?asset'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerKeyboardHandlers } from '@/lib/conveyor/handlers/keyboard-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'

export function createAppWindow(): void {
  // 注册自定义协议，统一加载静态资�?
  registerResourcesProtocol()

  // 创建主窗口，默认保持极窄尺寸，方便贴边悬�?
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
    title: '燕云十六声指挥工�?,
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

  // 注册主窗�?IPC 事件
  registerWindowHandlers(mainWindow)
  registerKeyboardHandlers(mainWindow)
  registerAppHandlers(app)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 开发模式默认打开 DevTools 方便调试
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载本地服务，生产环境加载打包后的 HTML
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


