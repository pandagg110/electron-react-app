from pathlib import Path

path = Path(r'app/components/battle/group-screen.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace("import { useConveyor } from '@/app/hooks/use-conveyor'\n", '')

key_block = "  const keyBadgeClass = isCompact\n    ? 'absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-1.5 text-[9px] tracking-widest text-slate-200'\n    : 'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-2 text-[10px] tracking-widest text-slate-200'\n\n"
text = text.replace(key_block, '')
text = text.replace("      {member.keyBinding && <span className={keyBadgeClass}>{member.keyBinding.toUpperCase()}</span>}\n", '')

old_interface = "interface CompactGroupOverlayProps {\n  role: GroupRole\n  members: MemberSnapshot[]\n  me?: MemberSnapshot\n  nextCaster?: MemberSnapshot\n  tick: number\n  profileKeyBinding: string | null\n  isBinding: boolean\n  onBind: () => void\n  onCast: () => void\n  onReset: () => void\n  onBack: () => void\n}\n\n"
new_interface = "interface CompactGroupOverlayProps {\n  role: GroupRole\n  members: MemberSnapshot[]\n  me?: MemberSnapshot\n  nextCaster?: MemberSnapshot\n  tick: number\n  isOnCooldown: boolean\n  remainingSeconds: number\n  onManualCast: () => void\n  onReset: () => void\n  onBack: () => void\n}\n\n"
if old_interface not in text:
    raise SystemExit('interface pattern not found')
text = text.replace(old_interface, new_interface)

old_compact_start = text.index('const CompactGroupOverlay = ({')
old_compact_end = text.index('export const GroupScreen = () => {')
new_compact = """const CompactGroupOverlay = ({\n  role,\n  members,\n  me,\n  nextCaster,\n  tick,\n  isOnCooldown,\n  remainingSeconds,\n  onManualCast,\n  onReset,\n  onBack,\n}: CompactGroupOverlayProps) => {\n  const nextName = nextCaster ? nextCaster.name : '等待排队'\n  const isMeNext = nextCaster?.profileId === me?.profileId\n  const orderedMembers = useMemo(\n    () =>\n      members\n        .map((member, index) => ({ member, index }))\n        .sort((a, b) => {\n          const remainingA = Math.max(0, a.member.readyAt - tick)\n          const remainingB = Math.max(0, b.member.readyAt - tick)\n          if (remainingA === remainingB) {\n            return a.index - b.index\n          }\n          return remainingA - remainingB\n        })\n        .map((entry) => entry.member),\n    [members, tick]\n  )\n  const buttonLabel = isOnCooldown\n    ? (remainingSeconds > 0 ? 技能冷却中 · s : '技能冷却中')\n    : '已经放技能'\n  return (\n    <div className=\"compact-overlay\">\n      <header className=\"compact-overlay__header\" style={{ WebkitAppRegion: 'no-drag' }}>\n        <button type=\"button\" aria-label=\"返回角色\" className=\"compact-overlay__back\" onClick={onBack}>\n          {'<'}\n        </button>\n        <div className=\"compact-overlay__title\">\n          <span className=\"compact-overlay__role\">{GROUP_LABELS[role]}</span>\n        </div>\n      </header>\n      <section className=\"compact-overlay__next\" style={{ WebkitAppRegion: 'no-drag' }}>\n        <span className=\"compact-overlay__next-label\">下一位</span>\n        <span className={cn('compact-overlay__next-name', isMeNext && 'compact-overlay__next-name--self')}>\n          {nextName}\n        </span>\n      </section>\n      {isMeNext && (\n        <div\n          className=\"rounded-md border border-emerald-500/80 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100\"\n          style={{ WebkitAppRegion: 'no-drag' }}\n        >\n          轮到你释放了！\n        </div>\n      )}\n      <section className=\"compact-overlay__members\" style={{ WebkitAppRegion: 'no-drag' }}>\n        {orderedMembers.length > 0 ? (\n          orderedMembers.map((member, index) => {\n            const remaining = Math.max(0, (member.readyAt - tick) / 1000)\n            const isNext = nextCaster?.profileId === member.profileId\n            const isMe = member.profileId === me?.profileId\n            return (\n              <CompactMemberItem\n                key={member.profileId}\n                member={member}\n                remaining={remaining}\n                isNext={isNext}\n                isMe={isMe}\n                isMyTurn={isNext && isMe}\n                index={index}\n              />\n            )\n          })\n        ) : (\n          <div className=\"compact-overlay__empty\">指挥尚未添加该职业成员</div>\n        )}\n      </section>\n      <section className=\"compact-overlay__actions\" style={{ WebkitAppRegion: 'no-drag' }}>\n        <button\n          type=\"button\"\n          className={cn(\n            'w-full rounded-xl py-4 text-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',\n            isOnCooldown\n              ? 'cursor-not-allowed bg-slate-700 text-slate-300'\n              : 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'\n          )}\n          disabled={isOnCooldown}\n          onClick={isOnCooldown ? undefined : onManualCast}\n        >\n          {buttonLabel}\n        </button>\n        <CompactActionButton tone=\"danger\" onClick={onReset} title=\"误触或重置冷却\">\n          重置冷却\n        </CompactActionButton>\n      </section>\n    </div>\n  )\n}\n\n"""
text = text[:old_compact_start] + new_compact + text[old_compact_end:]

new_group = """export const GroupScreen = () => {\n  const { profile, state, triggerCooldown, selectRole } = useBattleContext()\n  const [tick, setTick] = useState(() => timeNow())\n  const handleBack = () => selectRole(null)\n  const isCompact = useMediaQuery(COMPACT_MEDIA_QUERY)\n\n  useEffect(() => {\n    const id = window.setInterval(() => setTick(timeNow()), 1000)\n    return () => window.clearInterval(id)\n  }, [])\n\n  const groupRole = isGroupRole(profile.role) ? profile.role : null\n  const groupState = groupRole ? state.groups[groupRole] : null\n\n  const members = useMemo(\n    () =>\n      groupRole && groupState\n        ? groupState.order\n            .map((id) => state.members[id])\n            .filter((member): member is MemberSnapshot => Boolean(member))\n        : [],\n    [groupRole, groupState, state.members]\n  )\n\n  const me = groupRole ? state.members[profile.id] ?? null : null\n\n  const orderedMembers = useMemo(() => {\n    if (!groupRole) return []\n    const ranked = members.map((member, index) => ({ member, index }))\n    ranked.sort((a, b) => {\n      const remainingA = Math.max(0, a.member.readyAt - tick)\n      const remainingB = Math.max(0, b.member.readyAt - tick)\n      if (remainingA === remainingB) {\n        return a.index - b.index\n      }\n      return remainingA - remainingB\n    })\n    return ranked.map((entry) => entry.member)\n  }, [groupRole, members, tick])\n\n  const nextCaster = orderedMembers.find((member) => member.readyAt <= tick) ?? orderedMembers[0] ?? null\n  const isNextMe = nextCaster?.profileId === profile.id\n\n  const hasPlayedNextTurnRef = useRef(false)\n\n  useEffect(() => {\n    if (!isNextMe) {\n      hasPlayedNextTurnRef.current = false\n      return\n    }\n    if (hasPlayedNextTurnRef.current) return\n    hasPlayedNextTurnRef.current = true\n    const audio = new Audio(NEXT_TURN_AUDIO_SRC)\n    const playPromise = audio.play()\n    if (playPromise && typeof playPromise.catch === 'function') {\n      playPromise.catch(() => {\n        hasPlayedNextTurnRef.current = false\n      })\n    }\n    return () => {\n      audio.pause()\n      audio.currentTime = 0\n    }\n  }, [isNextMe])\n\n  const isOnCooldown = me ? me.readyAt > tick : false\n  const remainingSeconds = me ? Math.max(0, Math.ceil((me.readyAt - tick) / 1000)) : 0\n  const manualButtonLabel = isOnCooldown\n    ? (remainingSeconds > 0 ? 技能冷却中 · s : '技能冷却中')\n    : '已经放技能'\n  const cooldownStatusText = isOnCooldown\n    ? (remainingSeconds > 0 ? 冷却剩余 s : '冷却进行中')\n    : '冷却已就绪'\n\n  const handleManualCast = () => {\n    if (!groupRole || isOnCooldown) return\n    triggerCooldown(profile.id, 'cast')\n  }\n\n  const handleReset = () => {\n    if (!groupRole) return\n    triggerCooldown(profile.id, 'reset')\n  }\n\n  if (!groupRole || !groupState) {\n    return (\n      <div className=\"flex min-h-full flex-1 items-center justify-center px-2 text-center text-sm text-slate-300\">\n        当前角色无需技能排班，可关注指挥面板的全局提醒。\n      </div>\n    )\n  }\n\n  if (isCompact) {\n    return (\n      <CompactGroupOverlay\n        role={groupRole}\n        members={orderedMembers}\n        me={me ?? undefined}\n        nextCaster={nextCaster ?? undefined}\n        tick={tick}\n        isOnCooldown={isOnCooldown}\n        remainingSeconds={remainingSeconds}\n        onManualCast={handleManualCast}\n        onReset={handleReset}\n        onBack={handleBack}\n      />\n    )\n  }\n\n  return (\n    <div className=\"flex min-h-full flex-1 flex-col gap-3 text-slate-100\">\n      <div className=\"flex items-center justify-between text-xs text-slate-400\">\n        <Button variant=\"ghost\" size=\"sm\" onClick={handleBack}>\n          返回角色选择\n        </Button>\n        <span className=\"text-[11px] uppercase tracking-[0.4em] text-slate-500\">{GROUP_LABELS[groupRole]}</span>\n      </div>\n\n      <section className=\"rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3 shadow-sm\">\n        <div className=\"flex flex-col gap-3\">\n          <div className=\"flex items-start justify-between gap-2\">\n            <div>\n              <p className=\"text-[11px] uppercase tracking-[0.4em] text-slate-400\">轮转信息</p>\n              <p className=\"text-lg font-semibold\">\n                下一位施放：{nextCaster ? nextCaster.name : '等待排队'}\n              </p>\n            </div>\n          </div>\n          {isNextMe && (\n            <div className=\"rounded-md border border-emerald-500/80 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-emerald-500/30\">\n              轮到你释放了！\n            </div>\n          )}\n        </div>\n      </section>\n\n      <div className=\"flex flex-1 flex-col gap-2 overflow-y-auto pb-1\">\n        {orderedMembers.length > 0 ? (\n          orderedMembers.map((member, index) => {\n            const remaining = Math.max(0, (member.readyAt - tick) / 1000)\n            const isNext = nextCaster?.profileId === member.profileId\n            const isMe = member.profileId === profile.id\n            const isMyTurn = isNext && isMe\n\n            return (\n              <div\n                key={member.profileId}\n                className={cn(\n                  'flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 shadow-sm transition',\n                  isNext && 'border-emerald-400/70 shadow-emerald-500/10',\n                  isMe && 'ring-1 ring-slate-500/60',\n                  isMyTurn && 'animate-pulse border-emerald-500/80 shadow-emerald-500/20'\n                )}\n              >\n                <SkillIcon member={member} remaining={remaining} isNext={isNext} isMe={isMe} />\n                <div className=\"flex min-w-0 flex-1 flex-col\">\n                  <div className=\"flex items-center justify-between gap-2\">\n                    <span className=\"truncate text-sm font-semibold text-slate-100\">{member.name}</span>\n                    <span className=\"text-xs font-mono text-slate-400\">#{index + 1}</span>\n                  </div>\n                  <div className=\"flex items-center justify-between text-[11px] text-slate-400\">\n                    <span>{ROLE_CONFIG[member.role].label}</span>\n                    <span className={cn('font-mono', remaining <= 0 ? 'text-emerald-300' : 'text-slate-300')}>
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
"""
text = new_compact + new_group
path.write_text(text, encoding='utf-8')
