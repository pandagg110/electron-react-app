import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/app/config/supabase-client'
import { env, isSupabaseConfigured } from '@/app/config/env'
import { STORAGE_KEYS, loadJson, saveJson } from '@/app/utils/storage'
import { createId } from '@/app/utils/id'
import {
  battleReducer,
  createInitialBattleState,
  createMemberSnapshot,
  predictReadyAt,
} from './battle-reducer'
import type {
  BattleState,
  BroadcastPayload,
  ConnectionState,
  CooldownAdjustmentSource,
  GroupRole,
  MemberSnapshot,
  Profile,
  Role,
} from '@/app/types/battle'
import { GROUP_ROLES, ROLE_CONFIG } from '@/app/constants/battle'
import { now } from '@/app/utils/time'

interface BattleContextValue {
  state: BattleState
  profile: Profile
  connection: ConnectionState
  sessionId: string
  supabaseReady: boolean
  updateName: (name: string) => void
  selectRole: (role: Role | null) => void
  setKeyBinding: (key: string | null) => void
  triggerCooldown: (profileId: string, source?: CooldownAdjustmentSource) => void
  reorderGroup: (group: GroupRole, order: string[]) => void
  halveCooldowns: () => void
  resetAllCooldowns: () => void
  startBattle: () => void
  stopBattle: () => void
}

const BattleContext = createContext<BattleContextValue | undefined>(undefined)

const clampName = (name: string): string => name.trim().slice(0, 16)
const getMemberKey = (name: string): string => clampName(name).toLowerCase()

const loadProfile = (): Profile => {
  const stored = loadJson<Profile | null>(STORAGE_KEYS.profile, null)
  const name = stored?.name ? clampName(stored.name) : ''
  return {
    id: name ? getMemberKey(name) : createId(),
    name,
    role: stored?.role ?? null,
    keyBinding: stored?.keyBinding ?? null,
  }
}

export const BattleProvider = ({ children }: { children: React.ReactNode }) => {
  const supabaseReady = isSupabaseConfigured()
  const supabase = useMemo(() => (supabaseReady ? getSupabaseClient() : null), [supabaseReady])

  const [profile, setProfile] = useState<Profile>(() => loadProfile())
  const [sessionId] = useState(() => env.defaultSessionId)
  const [state, dispatch] = useReducer(battleReducer, undefined, createInitialBattleState)
  const stateRef = useRef<BattleState>(state)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSelfSignatureRef = useRef<string | null>(null)

  const [connection, setConnection] = useState<ConnectionState>(() =>
    supabaseReady
      ? { status: 'idle' }
      : { status: 'idle', message: 'Supabase 未配置，当前为本地模式' }
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    saveJson(STORAGE_KEYS.profile, profile)
  }, [profile])

  const sendBroadcast = useCallback(
    (payload: BroadcastPayload) => {
      if (!channelRef.current) return
      channelRef.current.send({ type: 'broadcast', event: 'battle', payload })
    },
    []
  )

  const ensureSelfMember = useCallback(
    (issuedAtOverride?: number): MemberSnapshot | null => {
      const role = profile.role
      if (!role) return null

      const memberKey = getMemberKey(profile.name)
      if (!memberKey) return null

      const issuedAt = issuedAtOverride ?? now()
      const existing = stateRef.current.members[memberKey]
      const displayName = clampName(profile.name)
      const keyBinding = profile.keyBinding ?? null
      const cooldownSeconds = existing?.cooldownSeconds ?? ROLE_CONFIG[role].cooldownSeconds

      if (!existing) {
        const order = GROUP_ROLES.includes(role as GroupRole)
          ? stateRef.current.groups[role as GroupRole].order.length
          : 0
        const member = createMemberSnapshot({
          profileId: memberKey,
          name: displayName,
          role,
          order,
          issuedAt,
        })
        member.cooldownSeconds = cooldownSeconds
        member.keyBinding = keyBinding
        dispatch({ type: 'REGISTER_MEMBER', member, issuedAt })
        return member
      }

      const patch: Partial<MemberSnapshot> = {}
      let touched = false

      if (existing.name !== displayName) {
        patch.name = displayName
        touched = true
      }
      if (existing.role !== role) {
        patch.role = role
        touched = true
      }
      if ((existing.keyBinding ?? null) !== keyBinding) {
        patch.keyBinding = keyBinding
        touched = true
      }

      if (touched) {
        dispatch({
          type: 'UPDATE_MEMBER',
          profileId: memberKey,
          patch,
          issuedAt,
        })
      }

      return {
        ...existing,
        ...patch,
      }
    },
    [dispatch, profile.keyBinding, profile.name, profile.role]
  )

  const buildPayload = useCallback(
    (member: MemberSnapshot, overrides?: Partial<BroadcastPayload>): BroadcastPayload => ({
      name: member.name,
      role: overrides?.role ?? member.role,
      cooldownSeconds: overrides?.cooldownSeconds ?? member.cooldownSeconds,
      readyAt: overrides?.readyAt ?? member.readyAt,
      lastCastAt: overrides?.lastCastAt ?? member.lastCastAt,
      keyBinding: overrides?.keyBinding ?? member.keyBinding ?? undefined,
      effect: overrides?.effect,
      groupOrder: overrides?.groupOrder,
      timer: overrides?.timer,
      issuedAt: overrides?.issuedAt ?? now(),
    }),
    []
  )

  const broadcastSelf = useCallback(
    (overrides?: Partial<BroadcastPayload>) => {
      const member = ensureSelfMember(overrides?.issuedAt)
      if (!member) return

      const payload = buildPayload(member, overrides)
      sendBroadcast(payload)

      if (!overrides?.effect && !overrides?.groupOrder && !overrides?.timer) {
        lastSelfSignatureRef.current = JSON.stringify({
          name: payload.name,
          role: payload.role,
          readyAt: payload.readyAt,
          lastCastAt: payload.lastCastAt,
          cooldownSeconds: payload.cooldownSeconds,
          keyBinding: payload.keyBinding ?? null,
        })
      }
    },
    [buildPayload, ensureSelfMember, sendBroadcast]
  )

  const broadcastRemoval = useCallback(
    (name: string, issuedAt?: number) => {
      const cleaned = clampName(name)
      if (!cleaned) return
      sendBroadcast({
        name: cleaned,
        role: null,
        cooldownSeconds: 0,
        readyAt: issuedAt ?? now(),
        lastCastAt: null,
        issuedAt: issuedAt ?? now(),
      })
    },
    [sendBroadcast]
  )

  const applyGlobalEffect = useCallback(
    (effect: 'half' | 'reset', issuedAt: number, actorName: string) => {
      const memberKey = getMemberKey(profile.name)
      if (!memberKey || getMemberKey(actorName) === memberKey) return
      const member = stateRef.current.members[memberKey]
      if (!member) return

      if (effect === 'reset') {
        dispatch({
          type: 'UPDATE_MEMBER',
          profileId: memberKey,
          patch: { readyAt: issuedAt, lastCastAt: null },
          issuedAt,
          source: 'global-reset',
        })
        broadcastSelf({ readyAt: issuedAt, lastCastAt: null, issuedAt })
      } else if (effect === 'half') {
        const remaining = member.readyAt - issuedAt
        const readyAt = remaining > 0 ? issuedAt + Math.ceil(remaining / 2) : issuedAt
        dispatch({
          type: 'UPDATE_MEMBER',
          profileId: memberKey,
          patch: { readyAt },
          issuedAt,
          source: 'global-half',
        })
        broadcastSelf({ readyAt, issuedAt })
      }
    },
    [broadcastSelf, dispatch, profile.name]
  )

  const applyRemotePayload = useCallback(
    (payload: BroadcastPayload) => {
      const displayName = clampName(payload.name)
      const memberKey = getMemberKey(displayName)
      if (!memberKey) return

      const issuedAt = payload.issuedAt ?? now()

      if (!payload.role) {
        dispatch({ type: 'REMOVE_MEMBER', profileId: memberKey, issuedAt })
        return
      }

      const existing = stateRef.current.members[memberKey]
      const cooldownSeconds = payload.cooldownSeconds ?? existing?.cooldownSeconds ?? ROLE_CONFIG[payload.role].cooldownSeconds

      const memberPatch: Partial<MemberSnapshot> = {
        name: displayName,
        role: payload.role,
        cooldownSeconds,
        readyAt: payload.readyAt ?? existing?.readyAt ?? issuedAt,
        lastCastAt: payload.lastCastAt ?? existing?.lastCastAt ?? null,
        keyBinding: payload.keyBinding ?? existing?.keyBinding ?? null,
      }

      if (!existing) {
        const order = GROUP_ROLES.includes(payload.role as GroupRole)
          ? stateRef.current.groups[payload.role as GroupRole].order.length
          : 0
        const member = createMemberSnapshot({
          profileId: memberKey,
          name: displayName,
          role: payload.role,
          order,
          issuedAt,
        })
        member.cooldownSeconds = memberPatch.cooldownSeconds
        member.readyAt = memberPatch.readyAt
        member.lastCastAt = memberPatch.lastCastAt
        member.keyBinding = memberPatch.keyBinding
        dispatch({ type: 'REGISTER_MEMBER', member, issuedAt })
      } else {
        dispatch({ type: 'UPDATE_MEMBER', profileId: memberKey, patch: memberPatch, issuedAt })
      }

      if (payload.groupOrder) {
        dispatch({
          type: 'SET_GROUP_ORDER',
          group: payload.groupOrder.role,
          order: payload.groupOrder.order,
          revision: payload.groupOrder.revision,
          issuedAt,
        })
      }

      if (payload.timer) {
        dispatch({ type: 'SET_TIMER', timer: { ...payload.timer, issuedAt }, issuedAt })
      }

      if (payload.effect) {
        applyGlobalEffect(payload.effect, issuedAt, payload.name)
      }
    },
    [applyGlobalEffect, dispatch]
  )

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setConnection({ status: 'idle', message: 'Supabase 未配置，当前为本地模式' })
      return
    }

    const channel = supabase.channel(`sessions:${sessionId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: getMemberKey(profile.name) || createId() },
      },
    })

    channelRef.current = channel

    channel.on('broadcast', { event: 'battle' }, ({ payload }) => {
      applyRemotePayload(payload as BroadcastPayload)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnection({ status: 'connected', message: 'Realtime 联机广播' })
        try {
          await channel.track({ profileId: getMemberKey(profile.name), name: profile.name, role: profile.role })
        } catch (error) {
          console.warn('Failed to track presence', error)
        }
        if (profile.role) {
          broadcastSelf()
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('Supabase realtime channel unavailable, falling back to offline mode')
        setConnection({ status: 'error', message: 'Supabase 未连接，已切换为本地离线模式' })
        if (channelRef.current === channel) {
          channelRef.current = null
        }
        supabase.removeChannel(channel)
      }
    })

    return () => {
      if (channelRef.current === channel) {
        channelRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [applyRemotePayload, broadcastSelf, profile.name, profile.role, sessionId, supabase, supabaseReady])

  useEffect(() => {
    const memberKey = getMemberKey(profile.name)
    if (!profile.role) {
      if (memberKey && stateRef.current.members[memberKey]) {
        const issuedAt = now()
        dispatch({ type: 'REMOVE_MEMBER', profileId: memberKey, issuedAt })
        broadcastRemoval(profile.name, issuedAt)
      }
      return
    }

    const member = ensureSelfMember()
    if (!member) return

    const signature = JSON.stringify({
      name: member.name,
      role: member.role,
      readyAt: member.readyAt,
      lastCastAt: member.lastCastAt,
      cooldownSeconds: member.cooldownSeconds,
      keyBinding: member.keyBinding ?? null,
    })

    if (lastSelfSignatureRef.current !== signature) {
      sendBroadcast(buildPayload(member))
      lastSelfSignatureRef.current = signature
    }
  }, [buildPayload, broadcastRemoval, dispatch, ensureSelfMember, profile.name, profile.role, sendBroadcast])

  const updateName = useCallback(
    (name: string) => {
      const trimmed = clampName(name)
      const prevKey = getMemberKey(profile.name)
      const nextKey = getMemberKey(trimmed)

      if (prevKey && prevKey !== nextKey && stateRef.current.members[prevKey]) {
        const issuedAt = now()
        dispatch({ type: 'REMOVE_MEMBER', profileId: prevKey, issuedAt })
        broadcastRemoval(profile.name, issuedAt)
      }

      setProfile((prev) => ({
        ...prev,
        id: nextKey || prev.id,
        name: trimmed,
      }))
    },
    [broadcastRemoval, dispatch, profile.name]
  )

  const selectRole = useCallback(
    (role: Role | null) => {
      setProfile((prev) => ({ ...prev, role }))
      if (!role) {
        const memberKey = getMemberKey(profile.name)
        if (memberKey && stateRef.current.members[memberKey]) {
          const issuedAt = now()
          dispatch({ type: 'REMOVE_MEMBER', profileId: memberKey, issuedAt })
          broadcastRemoval(profile.name, issuedAt)
        }
      } else {
        broadcastSelf({ issuedAt: now() })
      }
    },
    [broadcastRemoval, broadcastSelf, dispatch, profile.name]
  )

  const setKeyBinding = useCallback(
    (key: string | null) => {
      setProfile((prev) => ({ ...prev, keyBinding: key }))
      const memberKey = getMemberKey(profile.name)
      if (!memberKey) return
      dispatch({ type: 'UPDATE_MEMBER', profileId: memberKey, patch: { keyBinding: key }, issuedAt: now() })
      const member = stateRef.current.members[memberKey]
      if (member) {
        sendBroadcast(buildPayload({ ...member, keyBinding: key ?? null }))
      }
    },
    [buildPayload, dispatch, profile.name, sendBroadcast]
  )

  const triggerCooldown = useCallback(
    (profileId: string, source: CooldownAdjustmentSource = 'cast') => {
      const member = stateRef.current.members[profileId]
      if (!member) return
      const issuedAt = now()
      let readyAt = member.readyAt
      let lastCastAt = member.lastCastAt

      if (source === 'cast') {
        readyAt = predictReadyAt(issuedAt, member.cooldownSeconds)
        lastCastAt = issuedAt
      } else if (source === 'reset' || source === 'global-reset') {
        readyAt = issuedAt
        lastCastAt = null
      }

      dispatch({
        type: 'UPDATE_MEMBER',
        profileId,
        patch: { readyAt, lastCastAt },
        issuedAt,
        source,
      })

      const payload = buildPayload(
        {
          ...member,
          readyAt,
          lastCastAt,
        },
        { issuedAt }
      )
      sendBroadcast(payload)
    },
    [buildPayload, dispatch, sendBroadcast]
  )

  const reorderGroup = useCallback(
    (group: GroupRole, order: string[]) => {
      const issuedAt = now()
      dispatch({ type: 'SET_GROUP_ORDER', group, order, revision: issuedAt, issuedAt })
      broadcastSelf({ groupOrder: { role: group, order, revision: issuedAt }, issuedAt })
    },
    [broadcastSelf, dispatch]
  )

  const halveCooldowns = useCallback(() => {
    const memberKey = getMemberKey(profile.name)
    if (!memberKey) return
    const member = stateRef.current.members[memberKey]
    if (!member) return
    const issuedAt = now()
    const remaining = member.readyAt - issuedAt
    const readyAt = remaining > 0 ? issuedAt + Math.ceil(remaining / 2) : issuedAt

    dispatch({
      type: 'UPDATE_MEMBER',
      profileId: memberKey,
      patch: { readyAt },
      issuedAt,
      source: 'global-half',
    })

    broadcastSelf({ readyAt, issuedAt, effect: 'half' })
  }, [broadcastSelf, dispatch, profile.name])

  const resetAllCooldowns = useCallback(() => {
    const memberKey = getMemberKey(profile.name)
    if (!memberKey) return
    const member = stateRef.current.members[memberKey]
    if (!member) return
    const issuedAt = now()

    dispatch({
      type: 'UPDATE_MEMBER',
      profileId: memberKey,
      patch: { readyAt: issuedAt, lastCastAt: null },
      issuedAt,
      source: 'global-reset',
    })

    broadcastSelf({ readyAt: issuedAt, lastCastAt: null, issuedAt, effect: 'reset' })
  }, [broadcastSelf, dispatch, profile.name])

  const startBattle = useCallback(() => {
    const issuedAt = now()
    const timer = {
      status: 'running' as const,
      startedAt: issuedAt,
      pausedAt: null,
      elapsedSeconds: 0,
      issuedAt,
      wildNextSpawnAt: issuedAt + stateRef.current.wildConfig.intervalSeconds * 1000,
    }
    dispatch({ type: 'SET_TIMER', timer, issuedAt })
    broadcastSelf({ timer, issuedAt })
  }, [broadcastSelf, dispatch])

  const stopBattle = useCallback(() => {
    const issuedAt = now()
    const timer = {
      status: 'idle' as const,
      startedAt: null,
      pausedAt: null,
      elapsedSeconds: 0,
      issuedAt,
      wildNextSpawnAt: null,
    }
    dispatch({ type: 'SET_TIMER', timer, issuedAt })
    broadcastSelf({ timer, issuedAt })
  }, [broadcastSelf, dispatch])

  const value = useMemo<BattleContextValue>(
    () => ({
      state,
      profile,
      connection,
      sessionId,
      supabaseReady,
      updateName,
      selectRole,
      setKeyBinding,
      triggerCooldown,
      reorderGroup,
      halveCooldowns,
      resetAllCooldowns,
      startBattle,
      stopBattle,
    }),
    [
      state,
      profile,
      connection,
      sessionId,
      supabaseReady,
      updateName,
      selectRole,
      setKeyBinding,
      triggerCooldown,
      reorderGroup,
      halveCooldowns,
      resetAllCooldowns,
      startBattle,
      stopBattle,
    ]
  )

  return <BattleContext.Provider value={value}>{children}</BattleContext.Provider>
}

export const useBattleContext = (): BattleContextValue => {
  const context = useContext(BattleContext)
  if (!context) {
    throw new Error('useBattleContext must be used within BattleProvider')
  }
  return context
}
