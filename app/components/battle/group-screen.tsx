import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/app/components/ui/button'
import { GROUP_ROLES, ROLE_CONFIG } from '@/app/constants/battle'
import { useBattleContext } from '@/app/providers/battle-provider'
import type { GroupRole, MemberSnapshot, Role } from '@/app/types/battle'
import { cn } from '@/lib/utils'
import { now as timeNow } from '@/app/utils/time'
import { useMediaQuery } from '@/app/hooks/use-media-query'
import { useConveyor } from '@/app/hooks/use-conveyor'

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

const COMPACT_MEDIA_QUERY = '(max-width: 120px)'
const NEXT_TURN_AUDIO_SRC = new URL('../../../voice/语音播报.mp3', import.meta.url).href

const NEXT_TURN_AUDIO_VARIANT_SRC = new URL('../../../voice/语音播报2.mp3', import.meta.url).href
const VARIANT_AUDIO_PROBABILITY = 0.01

const isGroupRole = (role: Role | null): role is GroupRole => !!role && GROUP_ROLES.includes(role as GroupRole)

const formatStatusLabel = (remaining: number) => {
  if (remaining <= 0) return 'READY'
  if (remaining < 10) return `${remaining.toFixed(1)}s`
  return `${Math.ceil(remaining)}s`
}

const formatCountdown = (remaining: number) => (remaining <= 0 ? 'GO' : Math.ceil(remaining).toString())

const SkillIcon = ({
  member,
  remaining,
  isNext,
  isMe,
  variant = 'default',
}: {
  member: MemberSnapshot
  remaining: number
  isNext: boolean
  isMe: boolean
  variant?: 'default' | 'compact'
}) => {
  const cooldownSeconds = member.cooldownSeconds || 0
  const progress = cooldownSeconds > 0 ? Math.min(1, Math.max(0, (cooldownSeconds - remaining) / cooldownSeconds)) : 1
  const angle = Math.round(progress * 360)
  const ringColor = isNext ? '#34d399' : ROLE_RING_COLORS[member.role as GroupRole] ?? '#94a3b8'
  const isCompact = variant === 'compact'

  const containerClass = isCompact ? 'h-12 w-12 rounded-lg' : 'h-14 w-14 rounded-xl'
  const overlayClass = isCompact ? 'absolute inset-0 rounded-lg' : 'absolute inset-0 rounded-xl'
  const trackClass = isCompact
    ? 'absolute inset-[2px] rounded-[9px] border border-slate-800 bg-slate-950/90'
    : 'absolute inset-[3px] rounded-[10px] border border-slate-800 bg-slate-950/90'
  const faceClass = isCompact
    ? 'absolute inset-[3px] rounded-[8px] bg-gradient-to-br from-slate-800/40 to-slate-900/80'
    : 'absolute inset-1 rounded-lg bg-gradient-to-br from-slate-800/40 to-slate-900/80'
  const countdownClass = isCompact ? 'text-[11px]' : 'text-xs'
  const nextBadgeClass = isCompact
    ? 'absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-1.5 text-[9px] font-bold text-emerald-950'
    : 'absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-2 text-[10px] font-bold text-emerald-950'
  const keyBadgeClass = isCompact
    ? 'absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-1.5 text-[9px] tracking-widest text-slate-200'
    : 'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-2 text-[10px] tracking-widest text-slate-200'

  return (
    <div className={cn('relative shrink-0 border border-slate-800 bg-slate-950', containerClass, isMe && 'ring-1 ring-slate-500/60')}>
      <div className={overlayClass} style={{ backgroundImage: `conic-gradient(${ringColor} ${angle}deg, rgba(15, 23, 42, 0.82) ${angle}deg)` }} />
      <div className={trackClass} />
      <div className={cn(faceClass, 'flex items-center justify-center text-center font-semibold text-slate-100')}>
        <span className={countdownClass}>{remaining <= 0 ? 'GO' : Math.ceil(remaining)}</span>
      </div>
      {isNext && <span className={nextBadgeClass}>NEXT</span>}
      {member.keyBinding && <span className={keyBadgeClass}>{member.keyBinding.toUpperCase()}</span>}
    </div>
  )
}

interface CompactGroupOverlayProps {
  role: GroupRole
  members: MemberSnapshot[]
  me?: MemberSnapshot
  nextCaster?: MemberSnapshot
  tick: number
  profileKeyBinding: string | null
  isBinding: boolean
  onBind: () => void
  onCast: () => void
  onReset: () => void
  onBack: () => void
  audioMuted: boolean
  onToggleMute: () => void
}

const CompactActionButton = ({
  children,
  onClick,
  tone = 'default',
  active = false,
  title,
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'warn' | 'danger'
  active?: boolean
  title?: string
}) => {
  const toneStyles: Record<'default' | 'warn' | 'danger', string> = {
    default: 'border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80',
    warn: 'border-amber-500/70 bg-amber-900/60 text-amber-100 hover:bg-amber-800/70',
    danger: 'border-rose-600/80 bg-rose-900/70 text-rose-100 hover:bg-rose-800/80',
  }

  return (
    <button
      type="button"
      title={title}
      className={cn(
        'compact-overlay__action focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400',
        toneStyles[tone],
        active && 'border-emerald-400 text-emerald-100 shadow-[0_0_6px_rgba(16,185,129,0.45)]'
      )}
      style={{ WebkitAppRegion: 'no-drag' }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const CompactMemberItem = ({
  member,
  remaining,
  isNext,
  isMe,
  isMyTurn,
  index,
}: {
  member: MemberSnapshot
  remaining: number
  isNext: boolean
  isMe: boolean
  isMyTurn: boolean
  index: number
}) => (
  <div
    className={cn(
      'compact-overlay__member',
      isNext && 'compact-overlay__member--next',
      isMe && 'compact-overlay__member--self',
      isMyTurn && 'animate-pulse ring-1 ring-emerald-400/80'
    )}
  >
    <div className="compact-overlay__member-rank">#{index + 1}</div>
    <div className="compact-overlay__member-icon">
      <SkillIcon member={member} remaining={remaining} isNext={isNext} isMe={isMe} variant="compact" />
    </div>
    <div className="compact-overlay__member-name" title={member.name}>
      {member.name || `成员${index + 1}`}
    </div>
    <div className="compact-overlay__member-countdown">{formatCountdown(remaining)}</div>
  </div>
)

const CompactGroupOverlay = ({
  role,
  members,
  me,
  nextCaster,
  tick,
  profileKeyBinding,
  isBinding,
  onBind,
  onCast,
  onReset,
  onBack,
  audioMuted,
  onToggleMute,
}: CompactGroupOverlayProps) => {
  const nextName = nextCaster ? nextCaster.name : '等待排队'
  const isMeNext = nextCaster?.profileId === me?.profileId

  const orderedMembers = useMemo(
    () =>
      members
        .map((member, index) => ({ member, index }))
        .sort((a, b) => {
          const remainingA = Math.max(0, a.member.readyAt - tick)
          const remainingB = Math.max(0, b.member.readyAt - tick)
          if (remainingA === remainingB) {
            return a.index - b.index
          }
          return remainingA - remainingB
        })
        .map((entry) => entry.member),
    [members, tick]
  )

  return (
    <div className="compact-overlay">
      <header className="compact-overlay__header" style={{ WebkitAppRegion: 'no-drag' }}>
        <button type="button" aria-label="返回角色" className="compact-overlay__back" onClick={onBack}>
          {'<'}
        </button>
        <div className="compact-overlay__title">
          <span className="compact-overlay__role">{GROUP_LABELS[role]}</span>
          <span className="compact-overlay__key" title="当前绑定按键">
            {profileKeyBinding ? profileKeyBinding.toUpperCase() : '--'}
          </span>
        </div>
      </header>

      <section className="compact-overlay__next" style={{ WebkitAppRegion: 'no-drag' }}>
        <span className="compact-overlay__next-label">下一位</span>
        <span className={cn('compact-overlay__next-name', isMeNext && 'compact-overlay__next-name--self')}>
          {nextName}
        </span>
      </section>
      {isMeNext && (
        <div
          className="rounded-md border border-emerald-500/80 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          轮到你释放了！{profileKeyBinding ? `（${profileKeyBinding.toUpperCase()}）` : '请先绑定快捷键'}
        </div>
      )}

      <section className="compact-overlay__members" style={{ WebkitAppRegion: 'no-drag' }}>
        {orderedMembers.length > 0 ? (
          orderedMembers.map((member, index) => {
            const remaining = Math.max(0, (member.readyAt - tick) / 1000)
            const isNext = nextCaster?.profileId === member.profileId
            const isMe = member.profileId === me?.profileId

            return (
              <CompactMemberItem
                key={member.profileId}
                member={member}
                remaining={remaining}
                isNext={isNext}
                isMe={isMe}
                isMyTurn={isNext && isMe}
                index={index}
              />
            )
          })
        ) : (
          <div className="compact-overlay__empty">指挥尚未添加该职业成员</div>
        )}
      </section>

      <section className="compact-overlay__actions" style={{ WebkitAppRegion: 'no-drag' }}>
        <CompactActionButton onClick={onBind} active={isBinding} title="绑定大招按键（请在 5 秒内按键）">
          {isBinding ? '按键监听中' : '绑定按键'}
        </CompactActionButton>
        <CompactActionButton onClick={onCast} tone="warn" title="大招已释放">
          宣告释放
        </CompactActionButton>
        <CompactActionButton onClick={onReset} tone="danger" title="误触或重置冷却">
          重置冷却
        </CompactActionButton>
        <CompactActionButton
          onClick={onToggleMute}
          active={audioMuted}
          title={audioMuted ? '恢复语音播报' : '静音语音播报'}
        >
          {audioMuted ? '取消静音' : '静音播报'}
        </CompactActionButton>
      </section>
    </div>
  )
}

export const GroupScreen = () => {
  const { profile, state, triggerCooldown, setKeyBinding, selectRole, globalShortcutReady, audioMuted, toggleAudioMuted } = useBattleContext()
  const keyboard = useConveyor('keyboard')
  const [tick, setTick] = useState(() => timeNow())
  const [isBinding, setIsBinding] = useState(false)
  const lastShortcutTriggerRef = useRef(0)
  const role = profile.role
  const handleBack = () => selectRole(null)
  const isCompact = useMediaQuery(COMPACT_MEDIA_QUERY)

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
    if (globalShortcutReady) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (event.repeat) return
      if (event.key.toUpperCase() === profile.keyBinding?.toUpperCase()) {
        const now = Date.now()
        if (now - lastShortcutTriggerRef.current < 80) {
          return
        }
        lastShortcutTriggerRef.current = now
        event.preventDefault()
        triggerCooldown(profile.id, 'cast')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [globalShortcutReady, profile.id, profile.keyBinding, triggerCooldown])

  useEffect(() => {
    if (!profile.keyBinding) return
    if (!keyboard || typeof keyboard.onShortcut !== 'function') return

    const expected =
      profile.keyBinding.length === 1 ? profile.keyBinding.toUpperCase() : profile.keyBinding

    const unsubscribe = keyboard.onShortcut(({ key }) => {
      const normalized = key.length === 1 ? key.toUpperCase() : key
      if (normalized !== expected) {
        return
      }
      const now = Date.now()
      if (now - lastShortcutTriggerRef.current < 80) {
        return
      }
      lastShortcutTriggerRef.current = now
      triggerCooldown(profile.id, 'cast')
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [keyboard, profile.id, profile.keyBinding, triggerCooldown])

  if (!isGroupRole(role)) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-2 text-center text-sm text-slate-300">
        当前角色无需技能排班，可关注指挥面板的全局提醒?
      </div>
    )
  }

  const groupState = state.groups[role]
  const members = useMemo(
    () =>
      groupState.order
        .map((id) => state.members[id])
        .filter((member): member is MemberSnapshot => Boolean(member)),
    [groupState.order, state.members]
  )

  const me = state.members[profile.id]

  const orderedMembers = useMemo(() => {
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
  }, [members, tick])

  const nextCaster = orderedMembers.find((member) => member.readyAt <= tick) ?? orderedMembers[0]
  const isNextMe = nextCaster?.profileId === profile.id

  const hasPlayedNextTurnRef = useRef(false)

  useEffect(() => {
    if (!isNextMe || audioMuted) {
      hasPlayedNextTurnRef.current = false
      return
    }

    if (hasPlayedNextTurnRef.current) return

    hasPlayedNextTurnRef.current = true
    const source =
      Math.random() < VARIANT_AUDIO_PROBABILITY ? NEXT_TURN_AUDIO_VARIANT_SRC : NEXT_TURN_AUDIO_SRC
    const audio = new Audio(source)
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
  }, [audioMuted, isNextMe])


  const handleBindRequest = () => setIsBinding(true)
  const handleCast = () => triggerCooldown(profile.id, 'cast')
  const handleReset = () => triggerCooldown(profile.id, 'reset')
  const handleToggleMute = useCallback(() => {
    toggleAudioMuted()
  }, [toggleAudioMuted])

  if (isCompact) {
    return (
      <CompactGroupOverlay
        role={role}
        members={orderedMembers}
        me={me}
        nextCaster={nextCaster}
        tick={tick}
        profileKeyBinding={profile.keyBinding ?? null}
        isBinding={isBinding}
        onBind={handleBindRequest}
        onCast={handleCast}
        onReset={handleReset}
        onBack={handleBack}
        audioMuted={audioMuted}
        onToggleMute={handleToggleMute}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-3 text-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          返回角色选择
        </Button>
        <span className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{GROUP_LABELS[role]}</span>
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
            <div className="text-right text-[10px] leading-4 text-slate-400">
              <span className="block">当前键位</span>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-[2px] text-xs font-semibold text-slate-100">
                {profile.keyBinding ? profile.keyBinding.toUpperCase() : '未设置'}
              </span>
            </div>
          </div>
          {isNextMe && (
            <div className="rounded-md border border-emerald-500/80 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-emerald-500/30">
              轮到你释放了！{profile.keyBinding ? `（${profile.keyBinding.toUpperCase()}）` : '请先绑定快捷键'}
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

      <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3 shadow-sm" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400">操作指令</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Button size="sm" variant={isBinding ? 'secondary' : 'outline'} onClick={handleBindRequest}>
              {isBinding ? '按键监听中' : '绑定大招按键'}
            </Button>
            <Button size="sm" variant="default" onClick={handleCast}>
              宣告大招释放
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReset}>
              误触 / 重置冷却
            </Button>
            <Button size="sm" variant={audioMuted ? 'secondary' : 'outline'} onClick={handleToggleMute}>
              {audioMuted ? '取消静音播报' : '静音播报'}
            </Button>
          </div>
        </div>
      </section>

      {/* WIP big action button placeholder
        <section className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex flex-col gap-3">
            <button className="w-full rounded-2xl py-6 text-xl font-bold">manualButtonLabel</button>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Cooldown</span>
              <span className="font-semibold text-slate-200">cooldownStatusText</span>
            </div>
            <Button variant="destructive" disabled>Reset cd</Button>
          </div>
        </section>
      */}


    </div>
  )
}
