# 燕云十六声战斗指挥工具

Electron + React + Supabase 打造的多角色冷却面板。所有同步只依赖 Supabase Realtime broadcast，网络/服务不可用时会自动回退到本地模式。

![screenshot](app/assets/era-preview.png)

## 功能概览
- 指挥 / 治疗 / 陌刀 / 扇子 / 打野五套不同面板，覆盖冷却、排序、地图。
- 每位客户端只要广播自己的昵称/职业/冷却即可完成同步；无需数据库。
- 指挥的“半冷却 / 全重置”只广播一个 payload，其它客户端根据 payload 自己重算。
- 未配置 Supabase 时照常工作，日志会标注“本地模式”。

## 快速开始
1. 安装依赖：
   ```bash
   npm install
   ```
2. （可选）在项目根目录创建 `.env`：
   ```ini
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_BATTLE_SESSION_ID=default-session
   ```
   - URL / Key 缺失时会自动进入离线模式。
   - `VITE_BATTLE_SESSION_ID` 可以按战斗更换。
3. 开发模式：
   ```bash
   npm run dev
   ```
4. 选择昵称 → 选择职业 → 即可使用冷却面板。若有多台机器，同一频道内会实时同步。

## 运行原理速览
- 广播频道：`sessions:${sessionId}`。
- Payload 结构详见 [`docs/Broadcast_Payload.md`](docs/Broadcast_Payload.md)。
- `BattleProvider` 维护本地状态，收到 payload 仅做“覆盖式”更新；不依赖快照/数据库。
- 指挥全局技能广播一条 payload，其它客户端在本地调节后也会再广播，保证一致性。

## 文档
| 文档 | 说明 |
| --- | --- |
| [`docs/PRD.md`](docs/PRD.md) | 产品需求、界面流程 |
| [`docs/REALTIME_SYSTEM_REDESIGN.md`](docs/REALTIME_SYSTEM_REDESIGN.md) | 广播模式设计背景、调试建议 |
| [`docs/Broadcast_Payload.md`](docs/Broadcast_Payload.md) | payload 字段与同步策略 |

## 常见问题
- **进房即提示“本地模式”**：检查 `.env` 是否生效、网络是否允许访问 `supabase.co`、Dashboard 是否开启 Realtime。
- **成员数一直 0**：请确认已经点击角色按钮进入面板；只有选完职业才会广播。
- **要不要数据库？** 当前版本不需要。如果想持久化战斗日志，可以在服务端监听 broadcast 再写库，与前端解耦。

## 脚本 & 调试
- `npm run lint` / `npm run format` 保持代码质量。
- DevTools Console 日志会显示广播失败、回退到离线等状态。

## 构建
```bash
npm run build:win   # Windows 安装包
npm run build:mac   # macOS dmg
npm run build:linux # Linux AppImage / deb / snap
```
构建产物输出在 `dist/`。

---
欢迎继续扩展：战斗日志、观战模式、语音播报……只需在现有 broadcast 之上追加字段即可。
