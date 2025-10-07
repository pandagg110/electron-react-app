# 热键系统整理

## 总体流程
- 玩家在小队界面点击「绑定按键」后，`GroupScreen` 会监听下一次 `keydown` 并通过 `setKeyBinding` 写入上下文。
- `BattleProvider` 接收新的 `keyBinding`，更新本地状态与 Supabase 广播，并调用预加载层暴露的 `keyboard.registerBinding` 注册系统级热键。
- 预加载层的 `KeyboardApi` 将请求转发给主进程，`registerKeyboardHandlers` 使用 Electron `globalShortcut` 完成最终注册。
- 当热键触发时，主进程向渲染进程广播 `keyboard-shortcut` 事件；`BattleProvider` 与 `GroupScreen` 都在监听该事件并触发 `triggerCooldown`。
- 如果全局热键注册失败（例如按键被系统占用），渲染进程会继续保留窗口级别 `keydown` 监听作为兜底。

## 主进程逻辑
- 入口：`lib/main/app.ts` 在窗口创建时调用 `registerKeyboardHandlers`。
- 核心实现：`lib/conveyor/handlers/keyboard-handler.ts`
  - `normalizeKey` 统一用户输入格式（单字符转大写）。
  - 在重新绑定前执行 `globalShortcut.unregister` 清理旧快捷键。
  - `globalShortcut.register` 成功后向对应窗口 `webContents` 发送 `keyboard-shortcut` 消息。
  - 暴露 `keyboard-register-binding` / `keyboard-unregister-all` IPC 供渲染层调用。
  - 监听 `app.will-quit` 与窗口 `closed` 事件统一注销热键。

## 预加载与 IPC 抽象
- `lib/preload/preload.ts` 通过 `contextBridge` 暴露 `window.conveyor`。
- `lib/conveyor/api/index.ts` 挂载 `keyboard: new KeyboardApi(electronAPI)`。
- `lib/conveyor/api/keyboard-api.ts`
  - `registerBinding` / `unregisterAll` 调用前述两个 IPC handler。
  - `onShortcut` 订阅 `keyboard-shortcut` 事件并返回取消订阅函数，供 React 组件清理。

## 渲染进程状态层
- `app/providers/battle-provider.tsx`
  - 维护 `profile.keyBinding`，在 `setKeyBinding` 时同步 `state.members`、Supabase 广播与本地存储。
  - 监听 `profile.keyBinding` 改变：调用 `keyboard.registerBinding` 并设置 `globalShortcutReady` 状态；失败时提示并回落到窗口级快捷键。
  - 订阅 `keyboard.onShortcut`，通过 80ms 去抖保护与窗口级监听共享。
  - 管理战斗分组、冷却、广播等核心状态。

## UI 交互
- `app/components/battle/group-screen.tsx`
  - `isBinding` 为真时监听下一次 `keydown` 捕获用户按键，并立即调用 `setKeyBinding`。
  - 同步监听全局/窗口热键，使用相同的去抖逻辑保持界面与广播一致。
  - 操作面板新增「静音播报」开关按钮，点击后可在静音与非静音之间切换，按钮状态与 `BattleProvider` 暴露的 `audioMuted` 字段保持一致。
  - 紧凑模式组件 `CompactGroupOverlay` 同样提供静音按钮，方便小窗口或浮层场景使用。
  - `globalShortcutReady` 用于提示当前热键是否在系统层生效；失败时仍允许窗口内快捷键触发。
- `app/components/window/menus.ts`
  - 新增顶栏菜单「Sound」，包含「Toggle Voice Broadcast」项（快捷键 `Ctrl+Shift+M`），通过派发 `CustomEvent('battle:toggle-audio-mute')` 通知渲染层切换静音状态。

## 声音播报逻辑
- 默认语音文件：`voice/语音播报.mp3`。
- 备用语音文件：`voice/语音播报2.mp3`。
- `GroupScreen` 检测到当前轮到自己时按以下规则选择音频：
  - 静音关闭时才会触发播放。
  - 99% 概率播放默认文件，1% 概率播放备用文件。
  - 播放前会清理上一轮音频实例，并在播放失败（用户未授权等）时回退状态。

## 相关辅助文件
- `app/providers/battle-reducer.ts`：在 `REGISTER_MEMBER`、`UPDATE_MEMBER` 等 action 中同步 `keyBinding`。
- `app/components/window/TitlebarMenu.tsx`：处理菜单点击逻辑，响应「Sound」菜单发出的静音切换事件。
- `voice/` 目录：存放语音播报资源文件，构建时由 Vite asset pipeline 打包。

## 注意事项
- 静音状态保存在本地存储中，仅影响当前设备，不会广播给其他成员。
- 去抖阈值固定为 80ms，避免全局与窗口热键重复触发。
- 若后续计划支持组合键，需要同时修改 `normalizeKey`、前端比较逻辑与 UI 展示格式。
- 如需新增语音文件，请将资源放入 `voice/` 目录并在文档与打包配置中同步说明。
