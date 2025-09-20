import { app } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'

export function setupCacheDirectory() {
  // 设置自定义缓存目录，避免权限问题
  const userDataPath = app.getPath('userData')
  const customCachePath = path.join(userDataPath, 'cache')

  // 设置应用的缓存路径
  app.setPath('sessionData', customCachePath)

  // 确保单实例运行
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    console.warn('Another instance is already running, quitting...')
    app.quit()
    return false
  }

  return true
}

export function configureChromiumFlags() {
  // 添加 Chromium 命令行参数来处理缓存问题
  app.commandLine.appendSwitch('--disable-gpu-process-crash-limit')
  app.commandLine.appendSwitch('--disable-gpu-sandbox')
  app.commandLine.appendSwitch('--disable-software-rasterizer')
  app.commandLine.appendSwitch('--disable-background-timer-throttling')
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows')
  app.commandLine.appendSwitch('--disable-renderer-backgrounding')

  // 如果是开发环境，禁用缓存相关的错误
  if (process.env.NODE_ENV === 'development') {
    app.commandLine.appendSwitch('--disable-http-cache')
    app.commandLine.appendSwitch('--disable-gpu-shader-disk-cache')
  }

  // 设置自定义用户数据目录（如果需要）
  const tempDir = os.tmpdir()
  const appName = app.getName()
  const customUserDataDir = path.join(tempDir, `${appName}-userdata`)

  // 只在遇到权限问题时使用临时目录
  try {
    // 测试当前用户数据目录是否可写
    const currentUserData = app.getPath('userData')
    fs.accessSync(currentUserData, fs.constants.W_OK)
  } catch {
    console.warn('Current user data directory is not writable, using temp directory:', customUserDataDir)
    app.setPath('userData', customUserDataDir)
  }
}