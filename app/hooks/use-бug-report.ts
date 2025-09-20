
import { useState, useCallback } from 'react'
import { useBattleContext } from '@/app/providers/battle-provider'
import { isSupabaseConfigured, env } from '@/app/config/env'

export interface BugReportData {
  timestamp: string
  appVersion: string
  userAgent: string
  environment: {
    supabaseConfigured: boolean
    supabaseReady: boolean
    mode: 'online' | 'offline'
    supabaseUrl: string | null
    sessionId: string
    nodeEnv: string
  }
  battleState: {
    profile: {
      id: string
      name: string
      role: string | null
      hasKeyBinding: boolean
    }
    connectionStatus: string
    connectionMessage?: string
    version: number
    memberCount: number
    groupOrderSizes: Record<string, number>
  }
  systemInfo: {
    platform: string
    language: string
    timezone: string
    screenResolution: string
    memoryInfo?: {
      usedJSHeapSize: string
      totalJSHeapSize: string
      jsHeapSizeLimit: string
    } | null
  }
  recentErrors: string[]
  consoleHistory: string[]
  performanceMetrics: {
    loadTime: number | null
    domContentLoaded: number | null
    firstPaint: number | null
    firstContentfulPaint: number | null
    memoryUsage: {
      used: number
      total: number
    } | null
  } | null
}

export function useBugReport() {
  const [isCollecting, setIsCollecting] = useState(false)
  const battleContext = useBattleContext()

  const captureConsoleLogs = useCallback(() => {
    try {
      const storedLogs = sessionStorage.getItem('app-console-logs')
      return storedLogs ? JSON.parse(storedLogs).slice(-50) : []
    } catch {
      return []
    }
  }, [])

  const collectSystemInfo = useCallback((): BugReportData['systemInfo'] => {
    const perf = (window as any).performance
    const memory = perf?.memory

    return {
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      memoryInfo: memory
        ? {
            usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
            totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
            jsHeapSizeLimit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
          }
        : null,
    }
  }, [])

  const collectPerformanceMetrics = useCallback((): BugReportData['performanceMetrics'] => {
    if (!window.performance) return null

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const paintEntries = performance.getEntriesByType('paint')

    return {
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : null,
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : null,
      firstPaint: paintEntries.find((entry) => entry.name === 'first-paint')?.startTime ?? null,
      firstContentfulPaint:
        paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null,
      memoryUsage: (performance as any).memory
        ? {
            used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          }
        : null,
    }
  }, [])

  const collectErrorHistory = useCallback(() => {
    try {
      const errors = sessionStorage.getItem('app-error-history')
      return errors ? JSON.parse(errors) : []
    } catch {
      return []
    }
  }, [])

  const generateBugReport = useCallback(async (): Promise<BugReportData> => {
    setIsCollecting(true)

    try {
      const state = battleContext.state
      const systemInfo = collectSystemInfo()
      const performanceMetrics = collectPerformanceMetrics()
      const consoleHistory = captureConsoleLogs()
      const recentErrors = collectErrorHistory()
      const offline = !battleContext.supabaseReady || battleContext.connection.status !== 'connected'

      return {
        timestamp: new Date().toISOString(),
        appVersion: '12.0.0',
        userAgent: navigator.userAgent,
        environment: {
          supabaseConfigured: isSupabaseConfigured(),
          supabaseReady: battleContext.supabaseReady,
          mode: offline ? 'offline' : 'online',
          supabaseUrl: env.supabaseUrl ? `${env.supabaseUrl.slice(0, 64)}...` : null,
          sessionId: battleContext.sessionId,
          nodeEnv: process.env.NODE_ENV || 'unknown',
        },
        battleState: {
          profile: {
            id: battleContext.profile.id,
            name: battleContext.profile.name,
            role: battleContext.profile.role,
            hasKeyBinding: !!battleContext.profile.keyBinding,
          },
          connectionStatus: battleContext.connection.status,
          connectionMessage: battleContext.connection.message,
          version: state.version,
          memberCount: Object.keys(state.members).length,
          groupOrderSizes: Object.fromEntries(
            Object.entries(state.groups).map(([role, group]) => [role, group.order.length])
          ),
        },
        systemInfo,
        recentErrors,
        consoleHistory,
        performanceMetrics,
      }
    } finally {
      setIsCollecting(false)
    }
  }, [
    battleContext,
    captureConsoleLogs,
    collectErrorHistory,
    collectPerformanceMetrics,
    collectSystemInfo,
  ])

  const generateReportText = useCallback((report: BugReportData) => {
    const lines: string[] = []
    const append = (value: string) => lines.push(value)

    append('# 燕云十六声战斗工具 - 错误报告')
    append('')

    append('## 基本信息')
    append(`- 时间: ${report.timestamp}`)
    append(`- 版本: ${report.appVersion}`)
    append(`- 平台: ${report.systemInfo.platform}`)
    append(`- 用户代理: ${report.userAgent}`)
    append('')

    append('## 环境配置')
    append(`- Supabase 已配置: ${report.environment.supabaseConfigured ? '是' : '否'}`)
    append(`- Supabase 可用: ${report.environment.supabaseReady ? '是' : '否'}`)
    append(`- 当前模式: ${report.environment.mode === 'offline' ? '本地离线' : '联机广播'}`)
    append(`- 数据库 URL: ${report.environment.supabaseUrl || '未配置'}`)
    append(`- 会话 ID: ${report.environment.sessionId}`)
    append(`- 环境: ${report.environment.nodeEnv}`)
    append('')

    append('## 用户状态')
    append(`- 用户名: ${report.battleState.profile.name || '未设置'}`)
    append(`- 角色: ${report.battleState.profile.role || '未选择'}`)
    append(`- 连接状态: ${report.battleState.connectionStatus}`)
    if (report.battleState.connectionMessage) {
      append(
        `- 连接信息: ${
          typeof report.battleState.connectionMessage === 'string'
            ? report.battleState.connectionMessage
            : JSON.stringify(report.battleState.connectionMessage, null, 2)
        }`
      )
    }
    append(`- 成员数: ${report.battleState.memberCount}`)
    append(`- 状态版本: ${report.battleState.version}`)
    append('- 小队人数:')
    const groupEntries = Object.entries(report.battleState.groupOrderSizes)
    if (groupEntries.length > 0) {
      for (const [role, size] of groupEntries) {
        append(`  - ${role}: ${size} 人`)
      }
    } else {
      append('  - 无数据')
    }
    append('')

    append('## 系统信息')
    append(`- 分辨率: ${report.systemInfo.screenResolution}`)
    append(`- 时区: ${report.systemInfo.timezone}`)
    append(`- 语言: ${report.systemInfo.language}`)
    if (report.systemInfo.memoryInfo) {
      append(
        `- 内存使用: ${report.systemInfo.memoryInfo.usedJSHeapSize} / ${report.systemInfo.memoryInfo.totalJSHeapSize}`
      )
    }
    append('')

    append('## 性能指标')
    if (report.performanceMetrics) {
      append(`- 页面加载: ${report.performanceMetrics.loadTime ?? 'N/A'}ms`)
      append(`- DOM Ready: ${report.performanceMetrics.domContentLoaded ?? 'N/A'}ms`)
      append(`- 首次绘制: ${report.performanceMetrics.firstPaint ?? 'N/A'}ms`)
      append(`- 首次内容绘制: ${report.performanceMetrics.firstContentfulPaint ?? 'N/A'}ms`)
      if (report.performanceMetrics.memoryUsage) {
        append(
          `- 内存使用: ${report.performanceMetrics.memoryUsage.used}MB / ${report.performanceMetrics.memoryUsage.total}MB`
        )
      }
    } else {
      append('- 无性能数据')
    }
    append('')

    append('## 最近记录的错误')
    if (report.recentErrors.length > 0) {
      report.recentErrors.slice(-5).forEach((err, idx) => {
        append(`${idx + 1}. ${err}`)
      })
    } else {
      append('无历史错误')
    }
    append('')

    append('## 控制台日志')
    if (report.consoleHistory.length > 0) {
      append('```')
      report.consoleHistory.slice(-10).forEach((entry) => append(entry))
      append('```')
    } else {
      append('无控制台日志')
    }
    append('')

    append('---')
    append('*请将此报告复制给开发者以便快速定位问题。*')

    return lines.join('\n')
  }, [])

  const copyBugReport = useCallback(async () => {
    try {
      const report = await generateBugReport()
      const reportText = generateReportText(report)
      await navigator.clipboard.writeText(reportText)
      return { success: true as const, reportText }
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [generateBugReport, generateReportText])

  return {
    isCollecting,
    generateBugReport,
    copyBugReport,
  }
}
