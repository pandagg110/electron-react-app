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

const ROLE_RING_COLORS: Record<GroupRole, string> = {
  healer: '#34d399',
  blade: '#f59e0b',
  fan: '#38bdf8',
}

const isGroupRole = (role: Role | null): role is GroupRole => !!role && GROUP_ROLES.includes(role as GroupRole)

const formatStatus = (remaining: number) => {
  if (remaining <= 0) return 'READY'
  if (remaining < 10) return `${remaining.toFixed(1)}s`
  return `${Math.ceil(remaining)}s`
}

const SkillIcon = ({
  member,
  remaining,
  isNext,
  isMe,
}: {
  member: MemberSnapshot
  remaining: number
  isNext: boolean
  isMe: boolean
}) => {
  const cooldownSeconds = member.cooldownSeconds || 0
  const progress = cooldownSeconds > 0 ? Math.min(1, Math.max(0, (cooldownSeconds - remaining) / cooldownSeconds)) : 1
  const angle = Math.round(progress * 360)
  const ringColor = isNext ? '#34d399' : ROLE_RING_COLORS[member.role as GroupRole] ?? '#94a3b8'

  return (
    <div className={cn('relative h-14 w-14 shrink-0 rounded-xl border border-slate-800 bg-slate-950', isMe && 'ring-1 ring-slate-500/60')}>
      <div
        className="absolute inset-0 rounded-xl"
        style={{ backgroundImage: `conic-gradient(${ringColor} ${angle}deg, rgba(15, 23, 42, 0.8) ${angle}deg)` }}
      />
      <div className="absolute inset-[3px] rounded-[10px] border border-slate-800 bg-slate-950/90" />
      <div className="absolute inset-1 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/80 text-center text-xs font-semibold text-slate-100">
        {remaining <= 0 ? 'GO' : Math.ceil(remaining)}
      </div>
      {isNext && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 text-[10px] font-bold text-emerald-950">NEXT</span>}
      {member.keyBinding && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-2 text-[10px] tracking-widest text-slate-200">
          {member.keyBinding.toUpperCase()}
        </span>
      )}
    </div>
  )
}

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
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-slate-300">
        当前角色无需技能排班，可关注指挥面板的全局提醒。
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
    <div className="flex min-h-full flex-1 flex-col gap-3 text-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{GROUP_LABELS[role]}</span>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">轮转信息</p>
              <p className="text-lg font-semibold">
                下一位施放：{nextCaster ? nextCaster.name : '等待排队'}
              </p>
            </div>
            <div className="text-right text-[10px] leading-4 text-slate-400">
              <span className="block">当前键位</span>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-[2px] text-xs font-semibold text-slate-100">
                {profile.keyBinding ? profile.keyBinding.toUpperCase() : '未设置'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            指挥调整顺序后会自动同步，保持窗口在前台以确保按键监听。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={isBinding ? 'secondary' : 'outline'} onClick={() => setIsBinding(true)}>
              {isBinding ? '按键完成绑定' : '绑定大招按键'}
            </Button>
            <Button size="sm" variant="default" onClick={() => triggerCooldown(profile.id, 'cast')}>
              大招已释放
            </Button>
            <Button size="sm" variant="destructive" onClick={() => triggerCooldown(profile.id, 'reset')}>
              误触 / 重置CD
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-1">
        {members.map((member, index) => {
          const remaining = Math.max(0, (member.readyAt - tick) / 1000)
          const isNext = nextCaster?.profileId === member.profileId
          const isMe = member.profileId === profile.id

          return (
            <div
              key={member.profileId}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 shadow-sm transition',
                isNext && 'border-emerald-400/70 shadow-emerald-500/10',
                isMe && 'ring-1 ring-slate-500/60'
              )}
            >
              <SkillIcon member={member} remaining={remaining} isNext={isNext} isMe={isMe} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">{member.name}</span>
                  <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{ROLE_CONFIG[member.role].label}</span>
                  <span className={cn('font-mono', remaining <= 0 ? 'text-emerald-300' : 'text-slate-300')}>
                    {formatStatus(remaining)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        {members.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-700/70 text-sm text-slate-400">
            指挥尚未添加该职业成员
          </div>
        )}
      </div>

      {me && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
          <p>· 保持窗口聚焦才能监听快捷键，切换回游戏后请快速 alt+tab 返回确认。</p>
          <p>
            · 最近一次同步：{new Date(me.lastEventAt).toLocaleTimeString()}，若顺序异常请立即提醒指挥。
          </p>
        </section>
      )}
    </div>
  )
}
