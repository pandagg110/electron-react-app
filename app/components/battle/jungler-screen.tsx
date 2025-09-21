import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { useBattleContext } from '@/app/providers/battle-provider'
import { formatDuration, now as timeNow } from '@/app/utils/time'

const WildCooldownIcon = ({ remaining, interval }: { remaining: number | null; interval: number }) => {
  if (remaining === null || interval <= 0) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300">
        暂停
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(interval, remaining))
  const progress = 1 - clamped / interval
  const angle = Math.round(progress * 360)

  return (
    <div className="relative h-20 w-20 shrink-0">
      <div
        className="absolute inset-0 rounded-2xl border border-slate-800"
        style={{ backgroundImage: `conic-gradient(#38bdf8 ${angle}deg, rgba(15, 23, 42, 0.85) ${angle}deg)` }}
      />
      <div className="absolute inset-[4px] flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/90">
        <span className="text-xs font-semibold text-slate-200">野区</span>
        <span className="text-sm font-mono text-cyan-300">{formatDuration(clamped)}</span>
      </div>
    </div>
  )
}

export const JunglerScreen = () => {
  const { state, selectRole } = useBattleContext()
  const handleBack = () => selectRole(null)
  const [tick, setTick] = useState(() => timeNow())

  useEffect(() => {
    const id = window.setInterval(() => setTick(timeNow()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const wildRemaining = state.timer.wildNextSpawnAt
    ? Math.max(0, Math.ceil((state.timer.wildNextSpawnAt - tick) / 1000))
    : null
  const showAlert = wildRemaining !== null && wildRemaining <= state.wildConfig.preAlertSeconds

  return (
    <div className="flex min-h-full flex-1 flex-col gap-3 text-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-[11px] uppercase tracking-[0.4em] text-slate-500">打野情报</span>
      </div>

      <section className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 shadow-sm">
        <WildCooldownIcon remaining={wildRemaining} interval={state.wildConfig.intervalSeconds} />
        <div className="flex flex-1 flex-col gap-1 text-sm">
          <p className="text-slate-200">下一次刷新</p>
          <p className="text-lg font-semibold text-cyan-200">
            {wildRemaining !== null ? formatDuration(wildRemaining) : '--:--'}
          </p>
          <p className="text-xs text-slate-400">
            刷新间隔 {state.wildConfig.intervalSeconds / 60} 分钟 · 提前 {state.wildConfig.preAlertSeconds / 60} 分钟提醒
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 shadow-sm">
        <p>· 刷新前 1 分钟高亮提醒，请及时通知全队卡视野。</p>
        <p>· 资源被抢后记录对方刷新时间，等待指挥复盘。</p>
        {showAlert && <p className="text-emerald-300">· 刷新即将到来，准备抢夺关键资源！</p>}
      </section>
    </div>
  )
}
