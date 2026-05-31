# Chrona

本地优先的 Windows 桌面应用，自动追踪当前活跃窗口，生成时间统计与时间线，无需手动操作。

## 功能

- **自动追踪** — 后台静默记录每个应用的使用时长，无需手动开始/停止
- **总览** — 应用占比饼图、分类分布、应用排行、24h 时间分布、今日洞察、最近会话
- **活动** — 日历选择 + 甘特时间线，可视化展示什么时候在用什么软件
- **统计** — 年度活跃热力图、7/30/365 天趋势曲线、累计排行
- **分类管理** — 默认 8 个分类（开发/浏览器/通讯/文档/娱乐/设计/终端/其他），支持自定义编辑
- **色彩主题** — 8 套预设色 + 自定义取色，深色/浅色双模式
- **应用管理** — 编辑名称、颜色、分类；排除/持续记录规则可直接从已有应用列表勾选
- **数据管理** — 导出备份、导入恢复、一键重置清空数据
- **系统托盘** — 关闭窗口后继续后台追踪，点击托盘图标恢复
- **自定义标题栏** — 无原生边框，Linear 风格窗口控制按钮

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

**图标生成**
```bash
pip install Pillow
python scripts/generate_icons.py
```

数据存储在 `%LOCALAPPDATA%\chrona\chrona.db`。

## 技术栈

- **后端** — Rust + Tauri v2 + SQLite
- **前端** — React + TypeScript + Recharts + Lucide
- **设计** — Linear-style warm dark 主题系统，hairline 边框，CSS 自定义属性
- **追踪** — Windows API (`GetForegroundWindow`, `QueryFullProcessImageNameW`)
