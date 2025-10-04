# 热键系统整理

## 总体流程
- 玩家在小队界面点击“绑定按键”后，`GroupScreen` 监听下一次 `keydown` 并通过 `setKeyBinding` 写入上下文。
- `BattleProvider` 接收新的 `keyBinding`，更新本地状态与 Supabase 广播，并调用预加载层暴露的 `keyboard.registerBinding`。
- 预加载层的 `KeyboardApi` 把调用转发到主进程，主进程的 `registerKeyboardHandlers` 使用 Electron `globalShortcut` 注册系统级热键。
- 当热键触发时，主进程通过 IPC 向渲染进程发送 `keyboard-shortcut` 事件，`BattleProvider` 和 `GroupScreen` 都在监听该事件以触发 `triggerCooldown`。
- 如果全局热键注册失败（例如按键被系统占用），渲染进程会保留窗口级别的 `keydown` 监听作为兜底，避免用户完全失去快捷操作。

## 主进程逻辑
- 入口：`lib/main/app.ts` 在窗口创建时调用 `registerKeyboardHandlers`。
- 核心实现在 `lib/conveyor/handlers/keyboard-handler.ts`
  - `normalizeKey` 处理用户输入，单字符统一成大写。
  - 记录当前注册的按键，确保重新绑定时先调用 `globalShortcut.unregister` 清理旧键。
  - 使用 `globalShortcut.register` 注册系统热键，并在触发后向对应窗口 `webContents` 发送 `keyboard-shortcut` 消息。
  - 提供 `keyboard-register-binding` 与 `keyboard-unregister-all` 两个 IPC handler 供渲染层调用。
  - 监听 `app.will-quit` 以及窗口 `closed` 事件，统一注销热键，避免泄露。

## 预加载与 IPC 抽象
- `lib/preload/preload.ts` 通过 `contextBridge` 暴露 `window.conveyor`。
- `lib/conveyor/api/index.ts` 挂载 `keyboard: new KeyboardApi(electronAPI)`。
- `lib/conveyor/api/keyboard-api.ts`
  - `registerBinding`/`unregisterAll` 直接调用前述两个 IPC handler。
  - `onShortcut` 订阅 `keyboard-shortcut` 事件并返回取消订阅函数，供 React 组件清理。

## 渲染进程状态层
- `app/providers/battle-provider.tsx`
  - 维护 `profile.keyBinding`，并在 `setKeyBinding` 时同步 `state.members`、Supabase 广播以及本地存储。
  - `useEffect` 监听 `profile.keyBinding` 改变：调用 `keyboard.registerBinding`，根据返回值设置 `globalShortcutReady` 状态；失败时写 `console.warn` 并关闭指示灯。
  - 第二个 `useEffect` 订阅 `keyboard.onShortcut`，在收到主进程事件时调用 `triggerCooldown`，并通过 `lastShortcutTriggerRef` 做 80ms 去抖。
  - 当未能注册全局热键时，保留 `window` 级别的 `keydown` 监听作为后备方案，避免输入框内重复触发。

## UI 交互层
- `app/components/battle/group-screen.tsx`
  - `isBinding` 为真时监听下一次 `keydown` 以采集用户按键，并立即调用 `setKeyBinding`。
  - 与 `BattleProvider` 类似，组件内也监听 `keyboard.onShortcut` 与窗口级 `keydown`，复用了同一去抖逻辑，确保界面状态与指挥广播保持同步。
  - `globalShortcutReady` 用于提示当前热键是否已在系统层生效；若失败则仍然允许窗口内快捷键触发。
  - UI 中将绑定的键位展示在轮转列表与紧凑模式中，便于核对。

## 相关辅助文件
- `app/providers/battle-reducer.ts`：在 `REGISTER_MEMBER`、`UPDATE_MEMBER` 等 action 中同步存储 `keyBinding`，保证广播与本地状态一致。
- `app/components/window/menus.ts`：定义标题栏菜单与展示用快捷键信息，不影响战斗热键逻辑，但便于查阅。
- `lib/conveyor/handlers/window-handler.ts`：主要处理窗口操作，与标题栏显示的快捷操作一一对应，可作为扩展热键时的参考。

## 注意事项
- 全局热键仅支持单一注册，`keyboard.registerBinding(null)` 会注销当前热键，切换角色或关闭界面时记得调用。
- 去抖阈值设置为 80ms，避免系统级触发与窗口级触发重复执行。
- 若计划新增组合键支持，需要同时修改 `normalizeKey`、渲染层的比较逻辑，以及 UI 显示格式。
