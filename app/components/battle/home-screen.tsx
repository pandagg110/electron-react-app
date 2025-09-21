import { useMemo } from 'react'
import { ROLE_CONFIG } from '@/app/constants/battle'
import { useBattleContext } from '@/app/providers/battle-provider'
import type { Role } from '@/app/types/battle'
import { cn } from '@/lib/utils'
import { BugReportButton } from '@/app/components/bug-report'

const ROLE_ORDER: Role[] = ['commander', 'healer', 'blade', 'fan', 'jungler']

export const HomeScreen = () => {
  const { profile, updateName, selectRole, supabaseReady, connection } = useBattleContext()

  const roleCards = useMemo(() => ROLE_ORDER.map((key) => ({ key, config: ROLE_CONFIG[key] })), [])
  const disableRoleSelection = !profile.name || profile.name.trim().length < 2

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 text-slate-100">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">燕云十六声 · 百业战工具</p>
        <h1 className="text-2xl font-semibold">百业战实时指挥面板</h1>
        <p className="max-w-xl text-sm text-slate-300">
          输入昵称并选择职业，即可同步冷却、轮转顺序与战场提醒。支持指挥、治疗、陌刀、扇子与打野角色，本地/联机均可使用。
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-200" htmlFor="player-name">
            游戏昵称
          </label>
          <input
            id="player-name"
            value={profile.name}
            onChange={(event) => updateName(event.target.value)}
            placeholder="请输入 2-16 个字符"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-500"
          />
          <div className="space-y-1 text-xs text-slate-400">
            <p>· 昵称会统一转为小写并限制在 16 个字符以内。</p>
            <p>· 未配置 Supabase 时会自动切换到离线模式。</p>
          </div>
          <div className="rounded-md border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
            <p>
              <strong className="font-semibold text-slate-100">实时状态：</strong>
              {!supabaseReady
                ? ' 未配置 Supabase，当前为本地模式'
                : connection.status === 'connected'
                  ? ' Realtime 已连接'
                  : connection.status === 'connecting'
                    ? ' 正在连接 Realtime…'
                    : connection.status === 'error'
                      ? ` ${connection.message ?? '已切换到离线模式'}`
                      : ' 当前为离线模式'}
            </p>
          </div>
          <BugReportButton />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roleCards.map(({ key, config }) => (
            <button
              key={key}
              type="button"
              disabled={disableRoleSelection}
              onClick={() => selectRole(key)}
              className={cn(
                'group relative flex h-full flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-left shadow-sm transition hover:border-slate-400 hover:bg-slate-900',
                profile.name && !disableRoleSelection ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              )}
            >
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                  {config.label}
                </span>
                <p className="text-base font-semibold text-slate-100">{config.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>默认冷却：{config.cooldownSeconds ? `${config.cooldownSeconds}s` : '—'}</span>
                <span className="text-slate-500">点击或按 1-5 进入</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <footer className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">
        <p>· 指挥可拖拽调整顺序，所有客户端实时同步。</p>
        <p>· 技能冷却通过广播刷新，离线模式也会持续计时。</p>
        <p>· 指挥半冷却 / 重置会触发成员自行同步最新时间。</p>
      </footer>
    </div>
  )
}
