import { useState } from 'react'
import { useBugReport } from '@/app/hooks/use-bug-report'
import { cn } from '@/lib/utils'

export function BugReportButton() {
  const { isCollecting, copyBugReport } = useBugReport()
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

  const handleCopyBugReport = async () => {
    setCopyStatus('copying')

    try {
      const result = await copyBugReport()

      if (result.success) {
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 3000)
      } else {
        setCopyStatus('error')
        setTimeout(() => setCopyStatus('idle'), 3000)
        console.error('Bug report copy failed:', result.error)
      }
    } catch (error) {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 3000)
      console.error('Bug report copy error:', error)
    }
  }

  const getButtonText = () => {
    switch (copyStatus) {
      case 'copying':
        return '正在收集信息...'
      case 'success':
        return '✅ 已复制到剪贴板'
      case 'error':
        return '❌ 复制失败'
      default:
        return '📋 复制错误报告'
    }
  }

  const isDisabled = isCollecting || copyStatus === 'copying'

  return (
    <button
      onClick={handleCopyBugReport}
      disabled={isDisabled}
      className={cn(
        'w-full rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200',
        'flex items-center justify-center gap-2',
        isDisabled
          ? 'cursor-not-allowed border-slate-600 bg-slate-800 text-slate-400'
          : copyStatus === 'success'
            ? 'border-green-600 bg-green-900/30 text-green-400 hover:bg-green-900/40'
            : copyStatus === 'error'
              ? 'border-red-600 bg-red-900/30 text-red-400 hover:bg-red-900/40'
              : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
      )}
    >
      {isDisabled && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      )}
      {getButtonText()}
    </button>
  )
}