import type { GroupRole, Role, WildAlertConfig } from '@/app/types/battle'

export interface RoleConfig {
  label: string
  colorClass: string
  accentClass: string
  cooldownSeconds: number
  description: string
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  commander: {
    label: '指挥',
    colorClass: 'bg-slate-700 text-white',
    accentClass: 'border-slate-500',
    cooldownSeconds: 0,
    description: '统筹大局的指挥官界面',
  },
  healer: {
    label: '治疗',
    colorClass: 'bg-emerald-500 text-white',
    accentClass: 'border-emerald-400',
    cooldownSeconds: 80,
    description: '单体/群体治疗职业',
  },
  blade: {
    label: '陌刀',
    colorClass: 'bg-amber-500 text-white',
    accentClass: 'border-amber-400',
    cooldownSeconds: 120,
    description: '重武器爆发职业',
  },
  fan: {
    label: '扇子',
    colorClass: 'bg-sky-500 text-white',
    accentClass: 'border-sky-400',
    cooldownSeconds: 90,
    description: '增益与控制职业',
  },
  jungler: {
    label: '打野',
    colorClass: 'bg-purple-500 text-white',
    accentClass: 'border-purple-400',
    cooldownSeconds: 0,
    description: '负责野区资源的角色',
  },
}

export const GROUP_ROLES: GroupRole[] = ['healer', 'blade', 'fan']

export const DEFAULT_WILD_CONFIG: WildAlertConfig = {
  intervalSeconds: 5 * 60,
  preAlertSeconds: 60,
}

export const EARLY_CAST_FLAG_DURATION = 15_000
