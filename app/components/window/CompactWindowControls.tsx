import { cn } from '@/lib/utils'
import { useConveyor } from '@/app/hooks/use-conveyor'

interface CompactWindowControlsProps {
  className?: string
  pinned?: boolean
  onTogglePin?: () => void
}

export const CompactWindowControls = ({
  className,
  pinned = false,
  onTogglePin,
}: CompactWindowControlsProps) => {
  const { windowMinimize, windowClose } = useConveyor('window')
  const pinDisabled = typeof onTogglePin !== 'function'

  return (
    <div className={cn('flex items-center gap-1 px-1 pt-1 text-slate-300 sm:gap-1.5 sm:px-2', className)}>
      <div
        className="drag-handle mr-auto h-3 flex-1 rounded-full border border-slate-700/50 bg-slate-900/40"
        style={{ WebkitAppRegion: 'drag' }}
      />
      <button
        type="button"
        aria-label={pinned ? '取消窗口置顶' : '窗口置顶'}
        aria-pressed={pinned}
        title={pinned ? '取消窗口置顶' : '窗口置顶'}
        disabled={pinDisabled}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded border text-[11px] leading-none transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/70',
          pinned
            ? 'border-sky-500/70 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
            : 'border-transparent bg-slate-900/70 text-slate-200 hover:bg-slate-700/80',
          pinDisabled && 'cursor-not-allowed opacity-60 hover:bg-slate-900/70'
        )}
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => {
          if (!pinDisabled) {
            onTogglePin()
          }
        }}
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" focusable="false">
          <path d="M8 2.5 12 6H10v5.5H6V6H4l4-3.5Z" fill="currentColor" />
          <path d="M4 13.25h8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="最小化"
        className="flex h-5 w-5 items-center justify-center rounded bg-slate-900/70 text-[11px] leading-none text-slate-200 transition hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/60"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => windowMinimize()}
      >
        -
      </button>
      <button
        type="button"
        aria-label="关闭"
        className="flex h-5 w-5 items-center justify-center rounded bg-rose-900/70 text-[11px] leading-none text-rose-100 transition hover:bg-rose-700/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-300/70"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => windowClose()}
      >
        x
      </button>
    </div>
  )
}
