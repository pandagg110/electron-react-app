import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { GROUP_ROLES, ROLE_CONFIG } from '@/app/constants/battle'
import { useBattleContext } from '@/app/providers/battle-provider'
import type { GroupRole, MemberSnapshot } from '@/app/types/battle'
import { cn } from '@/lib/utils'
import { formatDuration, now as timeNow } from '@/app/utils/time'

interface DragState {
  group: GroupRole | null
  profileId: string | null
}

type GroupDescriptor = {
  role: GroupRole
  label: string
  members: MemberSnapshot[]
  flaggedId: string | null
  nextCaster?: MemberSnapshot
}

export const CommanderScreen = () => {
  const {
    state,
    startBattle,
    stopBattle,
    halveCooldowns,
    resetAllCooldowns,
    reorderGroup,
    selectRole,
  } = useBattleContext()
  const [tick, setTick] = useState(() => timeNow())
  const [dragging, setDragging] = useState<DragState>({ group: null, profileId: null })
  const handleBack = () => selectRole(null)

  useEffect(() => {
    const id = window.setInterval(() => setTick(timeNow()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const timerInfo = useMemo(() => {
    const timer = state.timer
    const isRunning = timer.status === 'running'
    const current = timeNow()
    const elapsed = isRunning && timer.startedAt ? Math.max(0, Math.floor((current - timer.startedAt) / 1000)) : 0
    const wildRemaining = timer.wildNextSpawnAt ? Math.max(0, Math.ceil((timer.wildNextSpawnAt - current) / 1000)) : null
    const preAlert = state.wildConfig.preAlertSeconds
    const showAlert = wildRemaining !== null && wildRemaining <= preAlert

    return {
      isRunning,
      battleClock: formatDuration(elapsed),
      wildRemaining,
      showAlert,
    }
  }, [state.timer, state.wildConfig])

  const groups: GroupDescriptor[] = useMemo(() => {
    const current = tick
    return GROUP_ROLES.map((role) => {
      const groupState = state.groups[role]
      const members = groupState.order
        .map((id) => state.members[id])
        .filter((member): member is MemberSnapshot => Boolean(member))

      const readyMember = members.find((member) => member.readyAt <= current)
      const flaggedId = groupState.flaggedOutOfTurn && current - groupState.flaggedOutOfTurn.flaggedAt <= 15_000
        ? groupState.flaggedOutOfTurn.profileId
        : null

      return {
        role,
        label: ROLE_CONFIG[role].label,
        members,
        flaggedId,
        nextCaster: readyMember ?? members[0],
      }
    })
  }, [state.groups, state.members, tick])

  const onDragStart = (group: GroupRole, profileId: string) => {
    setDragging({ group, profileId })
  }

  const onDrop = (group: GroupRole, targetProfileId: string | null) => {
    if (!dragging.profileId || dragging.group !== group) return
    const order = [...state.groups[group].order]
    const fromIndex = order.indexOf(dragging.profileId)
    if (fromIndex === -1) return
    order.splice(fromIndex, 1)
    if (targetProfileId) {
      const toIndex = order.indexOf(targetProfileId)
      order.splice(toIndex === -1 ? order.length : toIndex, 0, dragging.profileId)
    } else {
      order.push(dragging.profileId)
    }
    reorderGroup(group, order)
    setDragging({ group: null, profileId: null })
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 px-10 py-6">
      <div className="flex items-center justify-between text-slate-300">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">指挥面板</span>
      </div>
      <section className="grid grid-cols-1 items-center gap-6 rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-4 text-slate-100 shadow-lg md:grid-cols-[auto,1fr,auto]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">指挥控制台</p>
          <h2 className="text-3xl font-semibold">战斗计时 {timerInfo.isRunning ? '进行中' : '未开始'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">战斗时间</span>
            <span className="text-2xl font-mono">{timerInfo.battleClock}</span>
          </div>
          <div className={cn('flex items-baseline gap-2 rounded-md px-3 py-2', timerInfo.showAlert ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-800/60 text-slate-200')}>
            <span className="text-xs">野区刷新倒计时</span>
            <span className="text-lg font-mono">
              {timerInfo.wildRemaining !== null ? formatDuration(timerInfo.wildRemaining) : '--:--'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <Button size="sm" variant={timerInfo.isRunning ? 'destructive' : 'default'} onClick={timerInfo.isRunning ? stopBattle : startBattle}>
            {timerInfo.isRunning ? '战斗停止' : '战斗开始'}
          </Button>
          <Button size="sm" variant="secondary" onClick={halveCooldowns}>
            全员技能 CD 减半
          </Button>
          <Button size="sm" variant="outline" onClick={resetAllCooldowns}>
            重置全部 CD
          </Button>
        </div>
      </section>

      <section className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.role} className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">{group.label}</p>
                <p className="text-sm text-slate-300">下一个：{group.nextCaster ? group.nextCaster.name : '待加入'}</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{group.members.length} 人</span>
            </header>
            <div
              className="flex-1 space-y-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(group.role, null)}
            >
              {group.members.map((member) => {
                const remaining = Math.max(0, Math.ceil((member.readyAt - tick) / 1000))
                const isReady = remaining === 0
                const isNext = group.nextCaster?.profileId === member.profileId
                const isFlagged = group.flaggedId === member.profileId

                return (
                  <div
                    key={member.profileId}
                    draggable
                    onDragStart={() => onDragStart(group.role, member.profileId)}
                    onDragEnd={() => setDragging({ group: null, profileId: null })}
                    onDrop={() => onDrop(group.role, member.profileId)}
                    onDragOver={(event) => event.preventDefault()}
                    className={cn(
                      'rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 shadow transition',
                      isNext && 'border-emerald-400/70 bg-emerald-500/10 shadow-lg',
                      isFlagged && 'border-amber-500/80 bg-amber-500/10',
                      dragging.profileId === member.profileId && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{member.name}</span>
                        {member.keyBinding && (
                          <span className="rounded-md border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] tracking-widest text-slate-300">
                            {member.keyBinding.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className={cn('font-mono text-xs', isReady ? 'text-emerald-300' : 'text-slate-300')}>
                        {isReady ? '就绪' : `冷却 ${remaining}s`}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={cn('h-full rounded-full transition-all', isReady ? 'bg-emerald-400' : 'bg-slate-500')}
                        style={{ width: `${isReady ? 100 : Math.max(0, 100 - (remaining / member.cooldownSeconds) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{ROLE_CONFIG[member.role].label}</span>
                      {isFlagged && <span className="text-amber-300">提前施放，注意重排</span>}
                    </div>
                  </div>
                )
              })}
              {group.members.length === 0 && (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700/80 bg-slate-950/40 text-sm text-slate-500">
                  等待该职业成员加入
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

