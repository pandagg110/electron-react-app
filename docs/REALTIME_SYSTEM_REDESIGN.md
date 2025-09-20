# Realtime Broadcast System

## Overview
- 每位客户端仅通过 Supabase Realtime broadcast 频道 `sessions:{sessionId}` 交换数据。
- 不再使用数据库表；所有战斗状态都保留在本地 Reducer 中。
- 如果 Supabase 不可用，Provider 自动回退到离线模式，本机照常倒计时。

## Payload 设计
所有广播都复用同一个 payload 结构：

```ts
interface BattleBroadcastPayload {
  name: string           // 玩家显示名（作为唯一 key，全部转小写去空格）
  role: Role | null      // 玩家选择的职业，没有选择就发 null
  cooldownSeconds: number
  readyAt: number        // 时间戳 (ms) 表示技能恢复时间
  lastCastAt: number | null
  keyBinding?: string | null
  effect?: 'half' | 'reset'     // 指挥使用的全局技能，可选
  groupOrder?: {                // 指挥拖拽小队顺序时携带
    role: GroupRole
    order: string[]             // name key 数组
    revision: number            // 时间戳
  }
  issuedAt: number      // 时间戳 (ms)
}
```

### 基本规则
1. **进入房间**：立刻发送包含 `name/role/cooldownSeconds/readyAt/lastCastAt` 的 payload。其他客户端收到后，以 `name` 为 key 覆盖本地数据。
2. **技能释放**：本地更新自己的 `readyAt/lastCastAt`，然后广播最新 payload。
3. **Key 绑定变动**：更新 `keyBinding` 后同样立即广播。
4. **拖拽排序**：指挥端在更新本地顺序后，额外携带 `groupOrder` 字段广播；其他客户端按 revision 取最新顺序。
5. **全局技能**：
   - 指挥触发半冷却或重置时，发送 payload 并设置 `effect` 字段；自身也要先更新本地状态。
   - 所有客户端收到 `effect` 后只对“自己”的冷却进行调整，然后再广播自己的 payload（`effect` 为空），让队友得到新的时间。

## 本地缓存
- `members` 映射以 `name`（小写去空格）为 key，任何重复昵称的客户端都会相互覆盖，这正是我们想要的行为。
- Reducer 会在玩家首次出现时创建成员卡，并依职业把 name 塞入相应小队。
- `BattleProvider` 保留既有 UI 需要的 `groups`／`timer`／`wildConfig` 结构。

## 离线模式
- `.env` 缺失 `VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 时，Provider 直接设置 `connection.status = 'idle'`，消息提示“本地模式”。
- 若 websocket 连接断开或 subscribe 失败，同样会 fallback 为离线；所有冷却本地继续运转。

## 开发对照
- `broadcastSelfState()`：封装发送逻辑，永远带上完整的个人状态，可选地追加 `effect` 或 `groupOrder`。
- `applyRemotePayload()`：统一在 reducer 中覆盖成员数据；没有多余的 snapshot 逻辑。
- `handleGlobalEffect()`：收到 `effect` 时只处理本地玩家，然后调用 `broadcastSelfState()`。

## 调试建议
- DevTools Console 中只要看见 `Supabase realtime channel unavailable`，就检查网络/代理及 Dashboard 的 Realtime 设置。
- 如果多人进房后 UI 仍显示 0 人，请确认昵称唯一，且每个人都触发了“选择职业”的广播。
