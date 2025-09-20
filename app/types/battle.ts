export type Role = 'commander' | 'healer' | 'blade' | 'fan' | 'jungler'
export type GroupRole = 'healer' | 'blade' | 'fan'

export interface Profile {
  id: string
  name: string
  role: Role | null
  keyBinding?: string | null
  lastSeenAt?: number
}

export interface MemberSnapshot {
  profileId: string
  name: string
  role: Role
  order: number
  cooldownSeconds: number
  readyAt: number
  lastCastAt: number | null
  keyBinding?: string | null
  lastEventAt: number
}

export interface GroupState {
  role: GroupRole
  order: string[]
  revision: number
  flaggedOutOfTurn?: {
    profileId: string
    flaggedAt: number
  } | null
}

export interface BattleTimerState {
  status: 'idle' | 'running' | 'paused'
  startedAt: number | null
  pausedAt: number | null
  elapsedSeconds: number
  issuedAt: number
  wildNextSpawnAt: number | null
}

export interface WildAlertConfig {
  intervalSeconds: number
  preAlertSeconds: number
}

export interface BattleState {
  version: number
  members: Record<string, MemberSnapshot>
  groups: Record<GroupRole, GroupState>
  timer: BattleTimerState
  wildConfig: WildAlertConfig
}

export type CooldownAdjustmentSource = 'cast' | 'reset' | 'global-half' | 'global-reset'

export interface BroadcastPayload {
  name: string
  role: Role | null
  cooldownSeconds: number
  readyAt: number
  lastCastAt: number | null
  keyBinding?: string | null
  effect?: 'half' | 'reset'
  groupOrder?: {
    role: GroupRole
    order: string[]
    revision: number
  }
  timer?: {
    status: BattleTimerState['status']
    startedAt: number | null
    pausedAt: number | null
    elapsedSeconds: number
    wildNextSpawnAt: number | null
  }
  issuedAt: number
}

export type BroadcastEvent = {
  type: 'broadcast'
  event: 'battle'
  payload: BroadcastPayload
}

export interface PresencePayload {
  profileId: string
  name: string
  role: Role
}

export interface ConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'error'
  message?: string
}
