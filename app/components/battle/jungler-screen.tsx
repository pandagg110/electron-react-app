import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { useBattleContext } from '@/app/providers/battle-provider'
import { formatDuration, now as timeNow } from '@/app/utils/time'

export const JunglerScreen = () => {
  const { state, selectRole } = useBattleContext()
  const handleBack = () => selectRole(null)
  const [tick, setTick] = useState(() => timeNow())

  useEffect(() => {
    const id = window.setInterval(() => setTick(timeNow()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const wildRemaining = state.timer.wildNextSpawnAt ? Math.max(0, Math.ceil((state.timer.wildNextSpawnAt - tick) / 1000)) : null
  const showAlert = wildRemaining !== null && wildRemaining <= state.wildConfig.preAlertSeconds

  return (
    <div className="flex h-full flex-col gap-6 px-10 py-6 text-slate-100">
      <div className="flex items-center justify-between text-slate-300">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">打野信息</span>
      </div>
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-4 shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">打野信息台</p>
        <h2 className="text-3xl font-semibold">野区刷新倒计时</h2>
        <p className="mt-2 text-sm text-slate-300">
          掌握刷新节奏并回报指挥，抢占资源点。面板会在刷新前 1 分钟高亮提醒。
        </p>
      </section>
      <section className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg">
          <div>
            <p className="text-xs text-slate-400">下次刷新</p>
            <p className="text-5xl font-mono">
              {wildRemaining !== null ? formatDuration(wildRemaining) : '--:--'}
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p>刷新间隔：{state.wildConfig.intervalSeconds / 60} 分钟</p>
            <p>提前提醒：{state.wildConfig.preAlertSeconds / 60} 分钟</p>
            {showAlert && <p className="text-emerald-300">距离刷新不足 {state.wildConfig.preAlertSeconds / 60} 分钟，准备抢野区！</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-lg">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">公共通知</h3>
          <ul className="space-y-2 text-slate-400">
            <li>· 关注指挥推送的“战斗开始/停止”提示。</li>
            <li>· 若刷新后资源已被抢，请立即上报剩余时间辅助指挥决策。</li>
            <li>· 建议在野区刷新前 30 秒集合，确保抢野成功率。</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
