import pathlib
import textwrap

path = pathlib.Path(r"app\components\battle\group-screen.tsx")
text = path.read_text(encoding="utf-8")
start = text.find("export const GroupScreen = () => {")
if start != -1:
  new_group = textwrap.dedent("""
export const GroupScreen = () => {
  const { profile, state, triggerCooldown, selectRole } = useBattleContext()
  const [tick, setTick] = useState(() => timeNow())
  const handleBack = () => selectRole(null)
  const isCompact = useMediaQuery(COMPACT_MEDIA_QUERY)

  useEffect(() => {
    const id = window.setInterval(() => setTick(timeNow()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const groupRole = isGroupRole(profile.role) ? profile.role : null
  const groupState = groupRole ? state.groups[groupRole] : null

  const members = useMemo(
    () =>
      groupRole && groupState
        ? groupState.order
            .map((id) => state.members[id])
            .filter((member): member is MemberSnapshot => Boolean(member))
        : [],
    [groupRole, groupState, state.members]
  )

  const me = groupRole ? state.members[profile.id] ?? null : null

  const orderedMembers = useMemo(() => {
    if (!groupRole) return []
    const ranked = members.map((member, index) => ({ member, index }))
    ranked.sort((a, b) => {
      const remainingA = Math.max(0, a.member.readyAt - tick)
      const remainingB = Math.max(0, b.member.readyAt - tick)
      if (remainingA === remainingB) {
        return a.index - b.index
      }
      return remainingA - remainingB
    })
    return ranked.map((entry) => entry.member)
  }, [groupRole, members, tick])

  const nextCaster = orderedMembers.find((member) => member.readyAt <= tick) ?? orderedMembers[0] ?? null
  const isNextMe = nextCaster?.profileId === profile.id

  const hasPlayedNextTurnRef = useRef(false)

  useEffect(() => {
    if (!isNextMe) {
      hasPlayedNextTurnRef.current = false
      return
    }
    if (hasPlayedNextTurnRef.current) return
    hasPlayedNextTurnRef.current = true
    const audio = new Audio(NEXT_TURN_AUDIO_SRC)
    const playPromise = audio.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        hasPlayedNextTurnRef.current = false
      })
    }
    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [isNextMe])

  const isOnCooldown = me ? me.readyAt > tick : false
  const remainingSeconds = me ? Math.max(0, Math.ceil((me.readyAt - tick) / 1000)) : 0
  const manualButtonLabel = isOnCooldown
    ? (remainingSeconds > 0 ? `技能冷却中 · ${remainingSeconds}s` : '技能冷却中')
    : '已经放技能'
  const cooldownStatusText = isOnCooldown
    ? (remainingSeconds > 0 ? `冷却剩余 ${remainingSeconds}s` : '冷却进行中')
    : '冷却已就绪'

  const handleManualCast = () => {
    if (!groupRole || isOnCooldown) return
    triggerCooldown(profile.id, 'cast')
  }

  const handleReset = () => {
    if (!groupRole) return
    triggerCooldown(profile.id, 'reset')
  }

  if (!groupRole || !groupState) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-2 text-center text-sm text-slate-300">
        当前角色无需技能排班，可关注指挥面板的全局提醒。
      </div>
    )
  }

  if (isCompact) {
    return (
      <CompactGroupOverlay
        role={groupRole}
        members={orderedMembers}
        me={me ?? undefined}
        nextCaster={nextCaster ?? undefined}
        tick={tick}
        isOnCooldown={isOnCooldown}
        remainingSeconds={remainingSeconds}
        onManualCast={handleManualCast}
        onReset={handleReset}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-3 text-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{GROUP_LABELS[groupRole]}</span>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">轮转信息</p>
              <p className="text-lg font-semibold">
                下一位施放：{nextCaster ? nextCaster.name : '等待排队'}
              </p>
            </div>
          </div>
          {isNextMe && (
            <div className="rounded-md border border-emerald-500/80 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-emerald-500/30">
              轮到你释放了！
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-1">
        {orderedMembers.length > 0 ? (
          orderedMembers.map((member, index) => {
            const remaining = Math.max(0, (member.readyAt - tick) / 1000)
            const isNext = nextCaster?.profileId === member.profileId
            const isMe = member.profileId === profile.id
            const isMyTurn = isNext && isMe

            return (
              <div
                key={member.profileId}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 shadow-sm transition',
                  isNext && 'border-emerald-400/70 shadow-emerald-500/10',
                  isMe && 'ring-1 ring-slate-500/60',
                  isMyTurn && 'animate-pulse border-emerald-500/80 shadow-emerald-500/20'
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
                      {formatStatusLabel(remaining)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-700/70 text-sm text-slate-400">
            指挥尚未添加该职业成员
          </div>
        )}
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={cn(
              'w-full rounded-2xl py-6 text-xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
              isOnCooldown
                ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                : 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
            )}
            disabled={isOnCooldown}
            onClick={isOnCooldown ? undefined : handleManualCast}
          >
            {manualButtonLabel}
          </button>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>冷却状态</span>
            <span className="font-semibold text-slate-200">{cooldownStatusText}</span>
          </div>
          <Button variant="destructive" onClick={handleReset}>
            重置CD
          </Button>
        </div>
      </section>
    </div>
  )
}
""")
  text = new_group
  path.write_text(text, encoding="utf-8")
