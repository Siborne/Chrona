# Chrona

本地优先的 Windows 桌面应用，自动追踪当前活跃窗口，生成时间统计与时间线，无需手动操作。

## 功能

- **自动追踪** — 后台静默记录每个应用的使用时长，无需手动开始/停止
- **今天** — 应用占比、时长列表、24h 时间分布图
- **时间线** — 可视化展示什么时间在用什么软件，频繁切换一目了然
- **历史** — 日历选择日期，查看任意一天的记录
- **数据统计** — 近 7/30/365 天趋势图、年度热力图、累计排行
- **应用管理** — 自定义应用名称、颜色、分类
- **系统托盘** — 关闭窗口后继续后台追踪，点击托盘图标恢复

## 开发运行

**依赖**
- [Rust](https://rustup.rs/)
- Node.js 18+
- Windows 10/11

```bash
npm install
npm run tauri dev
```

**构建**
```bash
npm run tauri build
```

数据存储在 `%LOCALAPPDATA%\chrona\chrona.db`。

## 技术栈

- **后端** — Rust + Tauri v2 + SQLite
- **前端** — React + TypeScript + Recharts
- **追踪** — Windows API (`GetForegroundWindow`, `QueryFullProcessImageNameW`)
