import { DEFAULT_WILD_CONFIG, EARLY_CAST_FLAG_DURATION, GROUP_ROLES, ROLE_CONFIG } from '@/app/constants/battle'
import type {
  BattleState,
  BattleTimerState,
  CooldownAdjustmentSource,
  GroupRole,
  MemberSnapshot,
} from '@/app/types/battle'
import type { Role } from '@/app/types/battle'
import { addSeconds, now } from '@/app/utils/time'

export const createInitialBattleState = (): BattleState => ({
  version: 0,
  members: {},
  groups: GROUP_ROLES.reduce((acc, role) => {
    acc[role] = {
      role,
      order: [],
      revision: 0,
      flaggedOutOfTurn: null,
    }
    return acc
  }, {} as BattleState['groups']),
  timer: {
    status: 'idle',
    startedAt: null,
    pausedAt: null,
    elapsedSeconds: 0,
    issuedAt: 0,
    wildNextSpawnAt: null,
  },
  wildConfig: DEFAULT_WILD_CONFIG,
})

export const createMemberSnapshot = ({
  profileId,
  name,
  role,
  order,
  issuedAt,
}: {
  profileId: string
  name: string
  role: Role
  order: number
  issuedAt: number
}): MemberSnapshot => {
  const roleConfig = ROLE_CONFIG[role]
  const readyAt = now()

  return {
    profileId,
    name,
    role,
    order,
    cooldownSeconds: roleConfig.cooldownSeconds,
    readyAt,
    lastCastAt: null,
    keyBinding: null,
    lastEventAt: issuedAt,
  }
}

type BattleAction =
  | { type: 'REGISTER_MEMBER'; member: MemberSnapshot; issuedAt: number }
  | { type: 'REMOVE_MEMBER'; profileId: string; issuedAt: number }
  | {
      type: 'UPDATE_MEMBER'
      profileId: string
      patch: Partial<MemberSnapshot>
      issuedAt: number
      source?: CooldownAdjustmentSource
    }
  | { type: 'SET_GROUP_ORDER'; group: GroupRole; order: string[]; revision: number; issuedAt: number }
  | { type: 'SET_TIMER'; timer: BattleTimerState; issuedAt: number }
  | { type: 'APPLY_SNAPSHOT'; snapshot: BattleState; issuedAt: number }
  | { type: 'UPDATE_KEY_BINDING'; profileId: string; keyBinding: string | null; issuedAt: number }
  | { type: 'RESET_ALL'; issuedAt: number; readyAt: number }
  | { type: 'HALVE_ALL'; issuedAt: number }

export const battleReducer = (state: BattleState, action: BattleAction): BattleState => {
  switch (action.type) {
    case 'REGISTER_MEMBER':
      return registerMember(state, action.member, action.issuedAt)
    case 'REMOVE_MEMBER':
      return removeMember(state, action.profileId, action.issuedAt)
    case 'UPDATE_MEMBER':
      return updateMember(state, action.profileId, action.patch, action.issuedAt, action.source)
    case 'SET_GROUP_ORDER':
      return setGroupOrder(state, action.group, action.order, action.revision, action.issuedAt)
    case 'SET_TIMER':
      return setTimer(state, action.timer, action.issuedAt)
    case 'APPLY_SNAPSHOT':
      return applySnapshot(state, action.snapshot, action.issuedAt)
    case 'UPDATE_KEY_BINDING':
      return updateKeyBinding(state, action.profileId, action.keyBinding, action.issuedAt)
    case 'RESET_ALL':
      return resetAll(state, action.readyAt, action.issuedAt)
    case 'HALVE_ALL':
      return halveAll(state, action.issuedAt)
    default:
      return state
  }
}

const removeMember = (state: BattleState, profileId: string, issuedAt: number): BattleState => {
  if (!state.members[profileId]) {
    return state
  }

  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  delete next.members[profileId]

  GROUP_ROLES.forEach((role) => {
    const group = next.groups[role]
    const filtered = group.order.filter((id) => id !== profileId)
    if (filtered.length !== group.order.length) {
      group.order = filtered
      group.flaggedOutOfTurn = null
    }
  })

  return next
}

const registerMember = (state: BattleState, member: MemberSnapshot, issuedAt: number): BattleState => {
  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  const existing = next.members[member.profileId]

  next.members[member.profileId] = existing
    ? {
        ...existing,
        name: member.name,
        role: member.role,
        cooldownSeconds: member.cooldownSeconds,
        lastEventAt: issuedAt,
      }
    : { ...member, lastEventAt: issuedAt }

  if (member.role && GROUP_ROLES.includes(member.role as GroupRole)) {
    const group = next.groups[member.role as GroupRole]
    if (!group.order.includes(member.profileId)) {
      group.order = [...group.order, member.profileId]
    }
  }

  return next
}

const updateMember = (
  state: BattleState,
  profileId: string,
  patch: Partial<MemberSnapshot>,
  issuedAt: number,
  source?: CooldownAdjustmentSource
): BattleState => {
  const current = state.members[profileId]
  if (!current) {
    return state
  }

  if (issuedAt < current.lastEventAt) {
    return state
  }

  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  const updated: MemberSnapshot = {
    ...current,
    ...patch,
    lastEventAt: issuedAt,
  }

  next.members[profileId] = updated

  if (source === 'cast') {
    const role = updated.role
    if (GROUP_ROLES.includes(role as GroupRole)) {
      const group = next.groups[role as GroupRole]
      const filtered = group.order.filter((id) => id !== profileId)
      group.order = [...filtered, profileId]
      group.revision = Math.max(group.revision, issuedAt)
      if (filtered.length === 0 || filtered[0] !== profileId) {
        group.flaggedOutOfTurn = group.order[0] === profileId ? null : { profileId, flaggedAt: issuedAt }
      }
    }
  }

  if (source === 'reset' || source === 'global-reset') {
    const role = updated.role
    if (GROUP_ROLES.includes(role as GroupRole)) {
      next.groups[role as GroupRole].flaggedOutOfTurn = null
    }
  }

  return next
}

const setGroupOrder = (
  state: BattleState,
  groupKey: GroupRole,
  order: string[],
  revision: number,
  issuedAt: number
): BattleState => {
  const group = state.groups[groupKey]
  if (!group) {
    return state
  }

  if (revision < group.revision) {
    return state
  }

  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  next.groups[groupKey] = {
    ...group,
    order,
    revision,
    flaggedOutOfTurn: group.flaggedOutOfTurn,
  }

  order.forEach((profileId, index) => {
    const member = next.members[profileId]
    if (member) {
      member.order = index
    }
  })

  return next
}

const setTimer = (state: BattleState, timer: BattleTimerState, issuedAt: number): BattleState => {
  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  next.timer = { ...timer, issuedAt }
  return next
}

const applySnapshot = (state: BattleState, snapshot: BattleState, issuedAt: number): BattleState => {
  if (snapshot.version < state.version) {
    return state
  }

  const next = structuredClone(snapshot)
  next.version = Math.max(snapshot.version, issuedAt)
  next.wildConfig = state.wildConfig
  return next
}

const updateKeyBinding = (
  state: BattleState,
  profileId: string,
  keyBinding: string | null,
  issuedAt: number
): BattleState => {
  const member = state.members[profileId]
  if (!member) return state
  if (issuedAt < member.lastEventAt) return state
  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  next.members[profileId] = {
    ...member,
    keyBinding,
    lastEventAt: issuedAt,
  }
  return next
}

const resetAll = (state: BattleState, readyAt: number, issuedAt: number): BattleState => {
  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  Object.values(next.members).forEach((member) => {
    member.readyAt = readyAt
    member.lastCastAt = null
    member.lastEventAt = issuedAt
  })
  GROUP_ROLES.forEach((role) => {
    next.groups[role].flaggedOutOfTurn = null
  })
  return next
}

const halveAll = (state: BattleState, issuedAt: number): BattleState => {
  const next = structuredClone(state)
  next.version = Math.max(next.version, issuedAt)
  Object.values(next.members).forEach((member) => {
    const remaining = member.readyAt - issuedAt
    if (remaining <= 0) {
      return
    }
    const reduced = issuedAt + Math.ceil(remaining / 2)
    member.readyAt = Math.max(reduced, issuedAt)
    member.lastEventAt = issuedAt
  })
  GROUP_ROLES.forEach((role) => {
    const flag = next.groups[role].flaggedOutOfTurn
    if (flag && issuedAt - flag.flaggedAt > EARLY_CAST_FLAG_DURATION) {
      next.groups[role].flaggedOutOfTurn = null
    }
  })
  return next
}

export const shouldClearOutOfTurnFlag = (flaggedAt: number, reference: number): boolean =>
  reference - flaggedAt > EARLY_CAST_FLAG_DURATION

export const predictReadyAt = (issuedAt: number, cooldownSeconds: number): number => addSeconds(issuedAt, cooldownSeconds)
