import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { GROUP_ROLES, ROLE_CONFIG } from '@/app/constants/battle'
import { useBattleContext } from '@/app/providers/battle-provider'
import type { GroupRole, MemberSnapshot, Role } from '@/app/types/battle'
import { cn } from '@/lib/utils'
import { now as timeNow } from '@/app/utils/time'

const GROUP_LABELS: Record<GroupRole, string> = {
  healer: '治疗',
  blade: '陌刀',
  fan: '扇子',
}

const isGroupRole = (role: Role | null): role is GroupRole => !!role && GROUP_ROLES.includes(role as GroupRole)

export const GroupScreen = () => {
  const { profile, state, triggerCooldown, setKeyBinding, selectRole } = useBattleContext()
  const [tick, setTick] = useState(() => timeNow())
  const [isBinding, setIsBinding] = useState(false)
  const role = profile.role
  const handleBack = () => selectRole(null)

  useEffect(() => {
    const id = window.setInterval(() => setTick(timeNow()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isBinding) return
    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      setKeyBinding(key)
      setIsBinding(false)
    }
    window.addEventListener('keydown', handler, { once: true })
    return () => window.removeEventListener('keydown', handler)
  }, [isBinding, setKeyBinding])

  useEffect(() => {
    if (!profile.keyBinding) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (event.repeat) return
      if (event.key.toUpperCase() === profile.keyBinding?.toUpperCase()) {
        event.preventDefault()
        triggerCooldown(profile.id, 'cast')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [profile.id, profile.keyBinding, triggerCooldown])

  if (!isGroupRole(role)) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-300">
        当前角色无需技能轮换，可在指挥端查看公共提示。
      </div>
    )
  }

  const groupState = state.groups[role]
  const members = groupState.order
    .map((id) => state.members[id])
    .filter((member): member is MemberSnapshot => Boolean(member))

  const me = state.members[profile.id]
  const nextCaster = members.find((member) => member.readyAt <= tick) ?? members[0]

  return (
    <div className="flex h-full flex-col gap-6 px-10 py-6 text-slate-100">
      <div className="flex items-center justify-between text-slate-300">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {GROUP_LABELS[role]}
        </span>
      </div>
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-4 shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{GROUP_LABELS[role]} 轮换</p>
            <h2 className="text-3xl font-semibold">下一位施放：{nextCaster ? nextCaster.name : '等待排序'}</h2>
            <p className="text-sm text-slate-300">指挥调整顺序后会自动刷新，请按照当前顺序释放治疗或爆发。</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-slate-300">
            <p>
              当前绑定键位：{' '}
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm font-semibold">
                {profile.keyBinding ? profile.keyBinding.toUpperCase() : '未设置'}
              </span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant={isBinding ? 'secondary' : 'outline'} onClick={() => setIsBinding(true)}>
                {isBinding ? '按下绑定键…' : '绑定大招按键'}
              </Button>
              <Button size="sm" variant="default" onClick={() => triggerCooldown(profile.id, 'cast')}>
                大招已释放
              </Button>
              <Button size="sm" variant="destructive" onClick={() => triggerCooldown(profile.id, 'reset')}>
                误触 / 重置 CD
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
        <div className="grid grid-cols-1 gap-3">
          {members.map((member, index) => {
            const remaining = Math.max(0, Math.ceil((member.readyAt - tick) / 1000))
            const isReady = remaining === 0
            const isMe = member.profileId === profile.id
            const isNext = nextCaster?.profileId === member.profileId

            return (
              <div
                key={member.profileId}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 transition',
                  isNext && 'border-emerald-400/70 bg-emerald-500/10 shadow-lg',
                  isMe && 'ring-1 ring-slate-400/70'
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{member.name}</span>
                    {isNext && <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">NEXT</span>}
                    {isMe && <span className="rounded-md bg-slate-700/70 px-2 py-0.5 text-[10px]">YOU</span>}
                  </div>
                  <span className={cn('font-mono text-xs', isReady ? 'text-emerald-300' : 'text-slate-300')}>
                    {isReady ? '就绪' : `冷却 ${remaining}s`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>排序 #{index + 1}</span>
                  <span>职业：{ROLE_CONFIG[member.role].label}</span>
                </div>
              </div>
            )
          })}
          {members.length === 0 && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-700/80 text-sm text-slate-400">
              指挥尚未加入该职业成员。
            </div>
          )}
        </div>
      </section>

      {me && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-4 text-sm text-slate-300 shadow-lg">
          <p>· 保持窗口聚焦以监听按键；切回游戏后请重新聚焦本工具。</p>
          <p>
            · 若不在顺位内施放大招，请立即提醒指挥。当前顺序最后更新时间：{' '}
            {new Date(me.lastEventAt).toLocaleTimeString()}
          </p>
        </section>
      )}
    </div>
  )
}
