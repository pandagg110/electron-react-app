# Broadcast Payload 约定

战斗同步完全依赖 Supabase Realtime broadcast，只使用一个频道：

```ts
const channel = supabase.channel(`sessions:${sessionId}`)
```

## Payload 结构
```ts
interface BattleBroadcastPayload {
  name: string              // 玩家昵称（已去空格、裁剪 16 字以内）
  role: Role | null         // 指挥 / 治疗 / 陌刀 / 扇子 / 打野；未选则 null
  cooldownSeconds: number   // 该玩家的技能冷却基准
  readyAt: number           // 预期下一次就绪时间（ms 时间戳）
  lastCastAt: number | null // 最近一次释放时间（ms）
  keyBinding?: string | null
  effect?: 'half' | 'reset' // 指挥触发的全局技能，可选
  groupOrder?: {
    role: GroupRole         // healer/blade/fan
    order: string[]         // 成员 key 列表（昵称 toLowerCase）
    revision: number        // 时间戳，越大越新
  }
  timer?: {
    status: BattleTimerState['status']
    startedAt: number | null
    pausedAt: number | null
    elapsedSeconds: number
    wildNextSpawnAt: number | null
  }
  issuedAt: number          // 广播发出时的时间戳
}
```

## 覆盖策略
- `name` 会被裁剪为 16 字以内后再参与比较，作为唯一 key；相同昵称的广播会彼此覆盖。
- 收到 payload 时，以 `name` 为 key 更新本地 `members`；如果 `role === null` 则移除该成员。
- `groupOrder` 与 `timer` 使用 `ms` 时间戳进行版本对比，旧版本直接忽略。

## 常见场景
| 场景 | 发送方 payload | 接收方处理 |
| --- | --- | --- |
| 新人进房 | 携带完整 `name/role/cooldownSeconds/readyAt/lastCastAt/keyBinding` | 覆盖本地映射，若是新职业则追加进对应小队 |
| 自己放技能 | 更新本地 readyAt + lastCastAt 后广播 | 其他客户端覆盖该成员的冷却时间，继续倒计时 |
| 改键位 | 触发 `setKeyBinding` 并广播 | 所有客户端同步键位显示 |
| 指挥拖拽队列 | 更新本地 reducer → 广播 `groupOrder` | 其他客户端校验 revision 后应用新顺序 |
| 指挥半冷却 | 本地先把自己冷却减半 → 广播 `effect: 'half'` | 其他玩家收到后只处理“自己”，然后各自广播刷新后的冷却 |
| 指挥全重置 | 同上，`effect: 'reset'`，reset 完后再广播自状态 |
| 战斗计时 | `startBattle` / `stopBattle` 会附带 `timer` 字段 | 所有人保持一致的战斗时间、野怪刷新时间 |

## 离线模式
- `.env` 缺少 Supabase URL / Key 时，Provider 会输出 “Supabase 未配置，当前为本地模式”，所有操作仍在本地运行。
- 运行中如果频道断开 (`CHANNEL_ERROR/TIMED_OUT/CLOSED`)，同样会 fallback 到离线；冷却仍继续倒计时。
- 当网络恢复、重新启动应用后会再次加入 broadcast。

## 调试建议
- DevTools Console 关注 `Supabase realtime channel unavailable, falling back to offline mode` 日志。
- 如果看不到成员同步，确认每个人都真正“选了角色”——只有进入作战面板才会广播。
