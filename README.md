# Chrona

[![GitHub stars](https://img.shields.io/github/stars/Siborne/Chrona?style=social)](https://github.com/Siborne/Chrona/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Siborne/Chrona?style=social)](https://github.com/Siborne/Chrona/network/members)
![Rust](https://img.shields.io/badge/Rust-1.0+-000000?logo=rust&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=black)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)

> 本地优先的 Windows 桌面时间追踪器。自动记录当前活跃窗口，生成可视化时间统计与时间线，无需手动操作。

## ✨ 核心特性

### 自动追踪
- 后台静默记录每个应用的使用时长
- 无需手动开始 / 停止

### 数据洞察
- **总览**：应用占比、分类分布、应用排行、24h 分布、今日洞察、最近会话
- **活动**：日历选择 + 甘特时间线，查看“何时在用什么”
- **统计**：年度热力图、7/30/365 天趋势、累计排行

### 管理与体验
- **分类管理**：内置 8 个默认分类，支持自定义编辑
- **应用管理**：可编辑名称、颜色、分类；支持排除/持续记录规则
- **数据管理**：导出备份、导入恢复、一键重置
- **系统托盘**：关闭窗口后继续追踪，点击托盘图标恢复
- **界面体验**：Linear 风格自定义标题栏，深浅色模式 + 主题配色

## 🧱 技术栈

| 层级 | 技术 |
| --- | --- |
| 后端 | Rust + Tauri v2 + SQLite |
| 前端 | React + TypeScript + Recharts + Lucide |
| 追踪 | Windows API (`GetForegroundWindow`, `QueryFullProcessImageNameW`) |

## 🚀 开发运行

### 依赖环境
- [Rust](https://rustup.rs/)
- Node.js 18+
- Windows 10/11

### 启动开发环境
```bash
npm install
npm run tauri dev
```

## 🛠️ 构建

```bash
npm run tauri build
```

## 🎨 图标生成

```bash
pip install Pillow
python scripts/generate_icons.py
```

## 📂 数据存储

默认数据库路径：`%LOCALAPPDATA%\chrona\chrona.db`
