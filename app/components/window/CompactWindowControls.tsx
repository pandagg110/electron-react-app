import { cn } from '@/lib/utils'
import { useConveyor } from '@/app/hooks/use-conveyor'

interface CompactWindowControlsProps {
  className?: string
}

export const CompactWindowControls = ({ className }: CompactWindowControlsProps) => {
  const { windowMinimize, windowClose } = useConveyor('window')

  return (
    <div className={cn('flex items-center gap-1 px-1 pt-1 text-slate-300', className)}>
      <div
        className="drag-handle mr-auto h-3 flex-1 rounded-full border border-slate-700/50 bg-slate-900/40"
        style={{ WebkitAppRegion: 'drag' }}
      />
      <button
        type="button"
        aria-label="最小化"
        className="flex h-5 w-5 items-center justify-center rounded bg-slate-900/70 text-[11px] leading-none text-slate-200 transition hover:bg-slate-700/80"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => windowMinimize()}
      >
        -
      </button>
      <button
        type="button"
        aria-label="关闭"
        className="flex h-5 w-5 items-center justify-center rounded bg-rose-900/70 text-[11px] leading-none text-rose-100 transition hover:bg-rose-700/80"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => windowClose()}
      >
        x
      </button>
    </div>
  )
}



