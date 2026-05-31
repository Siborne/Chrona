# Chrona UI 重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Chrona 的界面从标准后台管理风格重设计为 Linear 式精密工具美学，包括全新色彩系统、Bento Grid 布局、卡片质感提升和背景渐变层。

**Architecture:** 全面重写 `src/App.css` 主题系统作为基础；调整 `App.tsx` 侧边栏结构；将 `Overview.tsx` 从等宽卡片网格重构为 12 列 Bento Grid；其他页面适配新主题 token。

**Tech Stack:** React + TypeScript + Tauri v2 + Recharts + Lucide React

---

## 文件映射

| 文件 | 变更类型 | 职责 |
|------|----------|------|
| `src/App.css` | 全面重写 | 全新主题系统：色彩变量、组件样式、布局、动效 |
| `src/App.tsx` | 修改 | Sidebar 收窄至 200px，去掉 logo 文字，调整 nav active indicator |
| `src/pages/Overview.tsx` | 大幅重构 | Bento Grid 布局：独立 stat row + 不规则卡片跨度 + 新增洞察卡片 |
| `src/pages/Activity.tsx` | 修改 | 适配新 card/hairline/progress-bar 样式，保持功能不变 |
| `src/pages/Stats.tsx` | 修改 | 适配新 card 样式，更新 recharts 颜色为 accent 系 |
| `src/pages/Settings.tsx` | 修改 | 适配新 card/btn/input 样式，保持功能不变 |
| `src/colorThemes.ts` | 修改 | 更新 COLOR_PRESETS 为新的 indigo 系 accent，保留工具函数 |
| `src/theme.ts` | 修改 | 更新 TIME_THEMES gradient 为新的 indigo 色调 |

---

## Task 1: 重写全局主题 CSS (`src/App.css`)

**Files:**
- Rewrite: `src/App.css`

- [ ] **Step 1: 替换整个文件内容**

Write the complete new `src/App.css`:

```css
/* ═══════════════════════════════════════════════════════════
   Chrona — Linear-style Theme System
   Warm dark ground, hairline detail, restraint as confidence
   ═══════════════════════════════════════════════════════════ */

/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Dark base theme (default) ──────────────────────────── */
:root {
  --ground: #07080A;
  --ground-glow: #0E1018;
  --surface-1: #13141A;
  --surface-2: #1A1B22;
  --surface-3: #22232C;
  --surface-highlight: rgba(255,255,255,0.03);
  --hairline: rgba(255,255,255,0.045);
  --hairline-strong: rgba(255,255,255,0.08);
  --text-primary: #F0F1F5;
  --text-secondary: #9CA3AF;
  --text-muted: #5C6270;
  --accent: #6366F1;
  --accent-soft: #818CF8;
  --accent-dim: rgba(99,102,241,0.12);
  --accent-hover: #5558E0;
  --sidebar-width: 200px;
  --header-height: 48px;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --transition: 180ms ease-out;
  --transition-slow: 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Light theme ────────────────────────────────────────── */
[data-theme="light"] {
  --ground: #FAFAFA;
  --ground-glow: #F5F5F7;
  --surface-1: #FFFFFF;
  --surface-2: #F3F4F6;
  --surface-3: #E5E7EB;
  --surface-highlight: rgba(0,0,0,0.02);
  --hairline: rgba(0,0,0,0.05);
  --hairline-strong: rgba(0,0,0,0.08);
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  --accent: #6366F1;
  --accent-soft: #818CF8;
  --accent-dim: rgba(99,102,241,0.08);
  --accent-hover: #4F46E5;
}

/* ── Background gradient layer ──────────────────────────── */
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 15% 10%, rgba(99,102,241,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 85%, rgba(139,92,246,0.04) 0%, transparent 50%),
    linear-gradient(160deg, #0C0E14 0%, #07080A 40%, #090A10 70%, #0D0E16 100%);
  pointer-events: none;
}

[data-theme="light"] .bg-layer {
  background: none;
}

/* ── Reset ──────────────────────────────────────────────── */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--ground);
  color: var(--text-primary);
  overflow: hidden;
  user-select: none;
  transition: background-color var(--transition-slow), color var(--transition-slow);
}

#root { display: flex; height: 100vh; width: 100vw; position: relative; }

/* ── Layout ─────────────────────────────────────────────── */
.app-layout { display: flex; width: 100%; height: 100%; position: relative; z-index: 1; }

/* ── Sidebar ────────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  flex-shrink: 0;
  position: relative;
}

.sidebar::after {
  content: '';
  position: absolute;
  top: 12%;
  right: 0;
  width: 1px;
  height: 76%;
  background: linear-gradient(180deg, transparent 0%, var(--hairline-strong) 20%, var(--hairline-strong) 80%, transparent 100%);
}

[data-theme="light"] .sidebar::after {
  background: linear-gradient(180deg, transparent 0%, var(--hairline) 20%, var(--hairline) 80%, transparent 100%);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0 28px;
}

.sidebar-logo svg { width: 36px; height: 36px; filter: drop-shadow(0 0 16px rgba(99,102,241,0.25)); }

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  position: relative;
}

.nav-item:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text-primary);
}

[data-theme="light"] .nav-item:hover {
  background: rgba(0,0,0,0.03);
}

.nav-item.active {
  background: rgba(99,102,241,0.10);
  color: var(--accent-soft);
  font-weight: 500;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2.5px;
  height: 18px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 8px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.2);
}

.nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }

.sidebar-footer {
  margin-top: auto;
  padding-top: 10px;
  position: relative;
}

.sidebar-footer::before {
  content: '';
  display: block;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--hairline) 30%, var(--hairline) 70%, transparent 100%);
  margin-bottom: 10px;
}

/* ── Main content ───────────────────────────────────────── */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: var(--header-height);
  flex-shrink: 0;
}

.page-header h2 {
  font-family: 'Inter Tight', sans-serif;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 28px 28px;
}

/* ── Buttons ────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  border: 1px solid var(--hairline);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  font-family: inherit;
}

[data-theme="light"] .btn {
  background: rgba(0,0,0,0.02);
}

.btn:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text-primary);
  border-color: var(--hairline-strong);
}

[data-theme="light"] .btn:hover {
  background: rgba(0,0,0,0.04);
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: transparent;
  box-shadow: 0 1px 3px rgba(99,102,241,0.25);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(99,102,241,0.35);
}

.btn-sm { padding: 3px 10px; font-size: 11px; }

.btn-danger { color: #FF3B30; border-color: rgba(255,59,48,0.2); }
.btn-danger:hover { background-color: #FF3B30; color: white; border-color: transparent; }

/* ── Inputs ─────────────────────────────────────────────── */
.input {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--hairline);
  background-color: rgba(255,255,255,0.03);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
  width: 100%;
  font-family: inherit;
}

[data-theme="light"] .input {
  background-color: var(--surface-1);
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

.select {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--hairline);
  background-color: rgba(255,255,255,0.03);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

[data-theme="light"] .select {
  background-color: var(--surface-1);
}

/* ── Cards ──────────────────────────────────────────────── */
.card {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, transparent 100%),
    var(--surface-1);
  border: 1px solid var(--hairline);
  border-top-color: rgba(255,255,255,0.07);
  border-radius: var(--radius-md);
  padding: 18px;
  position: relative;
  transition: all var(--transition);
  overflow: hidden;
}

[data-theme="light"] .card {
  background: var(--surface-1);
  border-top-color: rgba(0,0,0,0.04);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
  opacity: 0.6;
}

[data-theme="light"] .card::before {
  background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%);
}

.card:hover {
  border-color: rgba(255,255,255,0.08);
  border-top-color: rgba(255,255,255,0.12);
  transform: translateY(-1px);
  box-shadow:
    0 4px 20px rgba(0,0,0,0.3),
    0 0 0 1px rgba(255,255,255,0.04),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

[data-theme="light"] .card:hover {
  border-color: rgba(0,0,0,0.08);
  border-top-color: rgba(0,0,0,0.10);
  box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03);
  transform: translateY(-1px);
}

.card-glow {
  position: absolute;
  top: -40%;
  left: -20%;
  width: 60%;
  height: 60%;
  background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-slow);
}

.card:hover .card-glow { opacity: 1; }

.card-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title::before {
  content: '';
  width: 3px;
  height: 12px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.6;
}

/* ── Stat Cards ─────────────────────────────────────────── */
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.stat-card {
  background:
    linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 50%),
    linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, transparent 100%),
    var(--surface-1);
  border: 1px solid var(--hairline);
  border-top-color: rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  padding: 20px;
  position: relative;
  transition: all var(--transition);
  overflow: hidden;
}

[data-theme="light"] .stat-card {
  background:
    linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 50%),
    var(--surface-1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.3) 20%, rgba(99,102,241,0.15) 50%, transparent 100%);
  opacity: 0.5;
}

.stat-card:hover {
  border-color: rgba(99,102,241,0.15);
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 60px rgba(99,102,241,0.04);
}

.stat-value {
  font-family: 'Inter Tight', sans-serif;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  background: linear-gradient(180deg, var(--text-primary) 0%, var(--text-secondary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 400;
  letter-spacing: 0.03em;
}

/* ── Bento Grid ─────────────────────────────────────────── */
.bento {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  align-items: stretch;
}

.bento > .card { height: 100%; }

.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }
.span-5 { grid-column: span 5; }
.span-6 { grid-column: span 6; }
.span-7 { grid-column: span 7; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }

/* ── Utility classes ────────────────────────────────────── */
.color-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.duration-mono {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ── Progress bars ──────────────────────────────────────── */
.progress-bar {
  height: 3px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  overflow: hidden;
}

[data-theme="light"] .progress-bar {
  background: rgba(0,0,0,0.05);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 600ms var(--transition-slow);
}

/* ── Hourly chart ───────────────────────────────────────── */
.hourly-chart {
  display: flex;
  align-items: flex-end;
  height: 110px;
  gap: 3px;
}

.hourly-bar {
  flex: 1;
  background: linear-gradient(180deg, var(--accent-soft) 0%, var(--accent) 100%);
  border-radius: 3px 3px 0 0;
  opacity: 0.75;
  min-height: 3px;
  transition: opacity var(--transition), filter var(--transition);
  position: relative;
}

.hourly-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
  border-radius: 3px 3px 0 0;
}

.hourly-bar:hover {
  opacity: 1;
  filter: brightness(1.2);
}

.hourly-bar.empty {
  background: rgba(255,255,255,0.04);
  opacity: 0.4;
}

.hourly-bar.empty::after { display: none; }

[data-theme="light"] .hourly-bar.empty {
  background: rgba(0,0,0,0.06);
}

.hourly-labels {
  display: flex;
  margin-top: 6px;
  gap: 3px;
}

.hourly-label {
  flex: 1;
  text-align: center;
  font-size: 9px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* ── Pie legend ─────────────────────────────────────────── */
.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pie-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pie-legend-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie-legend-value {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.pie-legend-pct {
  color: var(--text-muted);
  font-size: 10px;
  width: 30px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── App list ───────────────────────────────────────────── */
.app-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

[data-theme="light"] .app-list-item {
  border-bottom-color: rgba(0,0,0,0.04);
}

.app-list-item:last-child { border-bottom: none; }

.app-list-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-list-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Session rows ───────────────────────────────────────── */
.session-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background var(--transition);
}

[data-theme="light"] .session-row {
  border-bottom-color: rgba(0,0,0,0.04);
}

.session-row:hover {
  background: rgba(255,255,255,0.02);
  margin: 0 -18px;
  padding: 7px 18px;
}

[data-theme="light"] .session-row:hover {
  background: rgba(0,0,0,0.02);
}

.session-row:last-child { border-bottom: none; }

.session-app {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-title {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 6px;
}

.session-time {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* ── Tables ─────────────────────────────────────────────── */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--hairline);
  font-size: 13px;
}

.table th {
  font-weight: 500;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.02em;
}

.table tr:last-child td { border-bottom: none; }

.table tbody tr {
  transition: background var(--transition);
}

.table tbody tr:hover td {
  background-color: rgba(255,255,255,0.02);
}

[data-theme="light"] .table tbody tr:hover td {
  background-color: rgba(0,0,0,0.02);
}

/* ── Empty state ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
  gap: 8px;
  font-size: 12px;
}

.empty-state svg { width: 40px; height: 40px; opacity: 0.4; }

/* ── Calendar ───────────────────────────────────────────── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition);
}

.calendar-day:hover { background-color: rgba(255,255,255,0.04); }
[data-theme="light"] .calendar-day:hover { background-color: rgba(0,0,0,0.03); }
.calendar-day.today { font-weight: 600; color: var(--accent); }
.calendar-day.selected {
  background: var(--accent);
  color: white;
  transition: all var(--transition);
}

/* ── Heatmap ────────────────────────────────────────────── */
.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  outline: 1px solid rgba(0,0,0,0.04);
}

.heatmap-cell.level-0 { background-color: var(--surface-3); }

/* ── Animations ─────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-body > * {
  animation: fadeIn 300ms ease;
}

/* ── Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

/* ── Tooltip ────────────────────────────────────────────── */
.tooltip {
  position: absolute;
  background: var(--surface-1);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04);
  font-size: 12px;
  z-index: 100;
  pointer-events: none;
  white-space: nowrap;
}

[data-theme="light"] .tooltip {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

/* ── Timeline ───────────────────────────────────────────── */
.timeline-container {
  position: relative;
  overflow-x: auto;
  padding: 16px 0;
}

.timeline-row {
  display: flex;
  align-items: center;
  height: 28px;
  margin-bottom: 3px;
}

.timeline-label {
  width: 120px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
  padding-right: 12px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-track {
  flex: 1;
  height: 100%;
  position: relative;
  background-color: var(--surface-3);
  border-radius: 4px;
}

.timeline-block {
  position: absolute;
  height: 100%;
  border-radius: 3px;
  opacity: 0.75;
  cursor: pointer;
  transition: opacity var(--transition);
}

.timeline-block:hover { opacity: 1; }

/* ── Responsive fallback ────────────────────────────────── */
@media (max-width: 900px) {
  .bento { grid-template-columns: 1fr; }
  .span-3, .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: span 1; }
  .stat-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: 验证 CSS 无语法错误**

在浏览器中打开应用（`npm run dev`），确认无样式异常、无控制台 CSS 报错。

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "feat: rewrite theme system with Linear-style warm dark aesthetic"
```

---

## Task 2: 更新 colorThemes.ts 预设颜色

**Files:**
- Modify: `src/colorThemes.ts:34-43`

- [ ] **Step 1: 替换 COLOR_PRESETS 数组**

```typescript
export const COLOR_PRESETS: ColorPreset[] = [
  { id: "indigo",    name: "靛蓝",      g1: "#6366F1", g2: "#818CF8" },
  { id: "violet",    name: "紫罗兰",    g1: "#8B5CF6", g2: "#A78BFA" },
  { id: "rose",      name: "玫瑰粉",    g1: "#F43F5E", g2: "#FB7185" },
  { id: "emerald",   name: "翡翠绿",    g1: "#10B981", g2: "#34D399" },
  { id: "cyan",      name: "海洋青",    g1: "#06B6D4", g2: "#22D3EE" },
  { id: "amber",     name: "琥珀金",    g1: "#D97706", g2: "#FBBF24" },
  { id: "coral",     name: "珊瑚红",    g1: "#EF4444", g2: "#F87171" },
  { id: "slate",     name: "岩灰",      g1: "#64748B", g2: "#94A3B8" },
];
```

- [ ] **Step 2: 更新默认 preset 引用**

在 `src/pages/Settings.tsx` 中，将默认 `colorPreset` 的初始值从 `"lavender"` 改为 `"indigo"`：

Find:
```typescript
const [colorPreset, setColorPreset] = useState(settings.color_preset ?? "lavender");
```

Replace with:
```typescript
const [colorPreset, setColorPreset] = useState(settings.color_preset ?? "indigo");
```

- [ ] **Step 3: Commit**

```bash
git add src/colorThemes.ts src/pages/Settings.tsx
git commit -m "feat: update color presets to new indigo-centric palette"
```

---

## Task 3: 更新 theme.ts 时间主题颜色

**Files:**
- Modify: `src/theme.ts:10-17`

- [ ] **Step 1: 替换 TIME_THEMES 的 gradient 值**

```typescript
const TIME_THEMES: Record<TimePeriod, TimeTheme> = {
  dawn:      { period: "dawn",      label: "凌晨好", emoji: "\u{1F305}", gradient: ["#818CF8", "#A5B4FC", "#C7D2FE"] },
  morning:   { period: "morning",   label: "早上好", emoji: "☀️",       gradient: ["#6366F1", "#818CF8", "#A5B4FC"] },
  afternoon: { period: "afternoon", label: "下午好", emoji: "\u{1F31E}",  gradient: ["#4F46E5", "#6366F1", "#818CF8"] },
  evening:   { period: "evening",   label: "晚上好", emoji: "\u{1F306}", gradient: ["#4338CA", "#4F46E5", "#6366F1"] },
  night:     { period: "night",     label: "夜深了", emoji: "\u{1F319}", gradient: ["#3730A3", "#4338CA", "#4F46E5"] },
  late:      { period: "late",      label: "夜深了", emoji: "⭐",      gradient: ["#312E81", "#3730A3", "#4338CA"] },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/theme.ts
git commit -m "feat: update time-theme gradients to indigo palette"
```

---

## Task 4: 重构 App.tsx 侧边栏

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 去掉 Sidebar logo 文字，调整导出按钮位置**

完整替换 `App()` 组件的 JSX return 部分（保留所有 hooks 和逻辑）：

Find the `return (` block in `App()` and replace with:

```tsx
  return (
    <>
      <div className="bg-layer" />
      <div className="app-layout">
        <nav className="sidebar" role="navigation" aria-label="主导航">
          <div className="sidebar-logo">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-soft)" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" fill="url(#grad)" />
              <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
              <line x1="50" y1="50" x2="50" y2="26" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="50" x2="67" y2="50" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="50" cy="50" r="2.5" fill="white" />
            </svg>
          </div>
          <Greeting />
          <div className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                  onClick={() => setCurrentPage(item.id)}
                  aria-label={item.label}
                  aria-current={currentPage === item.id ? "page" : undefined}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="sidebar-footer">
            <button className="nav-item" onClick={exportScreenshot} aria-label="导出截图">
              <Download />
              导出截图
            </button>
          </div>
        </nav>
        <main className="main-content">
          <PageComponent />
        </main>
      </div>
    </>
  );
```

- [ ] **Step 2: 验证侧边栏显示正确**

运行 `npm run dev`，确认：
- 侧边栏宽度为 200px
- 没有 "Chrona" 文字 logo
- 导出截图按钮在 sidebar 底部 footer 区域
- active nav item 有左侧发光竖线

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: redesign sidebar — 200px width, icon-only logo, glowing active indicator"
```

---

## Task 5: 重构 Overview.tsx 为 Bento Grid

**Files:**
- Modify: `src/pages/Overview.tsx`

- [ ] **Step 1: 更新顶部统计卡片区域**

找到 `tab === "today"` 渲染中的 `grid-3` stats 区域，替换为 `stat-row`：

Find:
```tsx
                <div className="grid-3" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div className="stat-value">{formatDuration(totalTime)}</div>
                    <div className="stat-label">总使用时长</div>
                  </div>
                  <div className="card">
                    <div className="stat-value">{stats.length}</div>
                    <div className="stat-label">活跃应用数</div>
                  </div>
                  <div className="card">
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">记录会话数</div>
                  </div>
                </div>
```

Replace with:
```tsx
                <div className="stat-row">
                  <div className="stat-card">
                    <div className="stat-value">{formatDuration(totalTime)}</div>
                    <div className="stat-label">总使用时长</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.length}</div>
                    <div className="stat-label">活跃应用数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">记录会话数</div>
                  </div>
                </div>
```

- [ ] **Step 2: 重构 Today 视图为 Bento Grid**

将 Today 视图中的 `grid-2` 卡片区域替换为 `bento` grid：

Find:
```tsx
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div className="card-title">应用占比</div>
```

Replace the entire first `grid-2` block (应用占比 + 分类分布) with:

```tsx
                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">应用占比</div>
```

Then find the closing `</div>` for that first grid-2 block (after CategoryBars) and ensure it closes the `span-5` + `span-4` cards within the `bento` container.

The full replacement for the two `grid-2` sections in Today view should be:

```tsx
                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">应用占比</div>
                    {appPieData.length === 0 ? (
                      <div className="empty-state"><Clock /><p>暂无使用记录</p></div>
                    ) : (
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 120, flexShrink: 0 }}>
                          <ResponsiveContainer width={120} height={120}>
                            <PieChart>
                              <Pie data={appPieData} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={54}>
                                {appPieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                              </Pie>
                              <ReTooltip formatter={(v: number) => formatDuration(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: 180 }}>
                          {appPieData.slice(0, 6).map((d) => (
                            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--hairline)" }}>
                              <span className="color-dot" style={{ backgroundColor: d.color, color: d.color }} />
                              <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                              <span className="duration-mono">{formatDuration(d.value)}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", width: 30, textAlign: "right" }}>{totalTime > 0 ? `${Math.round((d.value / totalTime) * 100)}%` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card span-4">
                    <div className="card-glow" />
                    <div className="card-title">分类分布</div>
                    <CategoryBars data={catStats} />
                  </div>
                  <div className="card span-3">
                    <div className="card-glow" />
                    <div className="card-title">应用排行</div>
                    <TopAppsList stats={stats} total={totalTime} />
                  </div>
                </div>
```

- [ ] **Step 3: 重构第二行 Bento（24小时 + 洞察）**

Find the second `grid-2` block (24小时分布 + 应用排行), replace with:

```tsx
                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-7">
                    <div className="card-glow" />
                    <div className="card-title">24小时分布</div>
                    <HourlyChart date={dateStr} />
                  </div>
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">今日洞察</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.1)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{catStats[0]?.category_name || "开发"}时间占比最高</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>今日主要专注领域</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent-soft), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
                            {(() => {
                              const maxHour = data.length > 0 ? data.reduce((max, d) => d.duration > max.duration ? d : max, data[0]) : null;
                              return maxHour ? `${maxHour.hour}:00 最活跃` : "暂无数据";
                            })()}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>峰值使用时段</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
```

**注意**: 这个洞察卡片中引用了一个未定义的 `data` 变量。实际上这个变量在 `HourlyChart` 内部有定义，但这里在父组件里。需要修正为使用已有数据计算：

替换洞察卡片的代码为更安全的版本：

```tsx
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">今日洞察</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.1)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{catStats[0]?.category_name || "开发"}时间占比最高</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>今日主要专注领域</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent-soft), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>专注时段分析</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>查看24小时分布了解峰值</div>
                        </div>
                      </div>
                    </div>
                  </div>
```

- [ ] **Step 4: 重构最近会话为全宽卡片**

Find:
```tsx
                <div className="card">
                  <div className="card-title">最近会话</div>
                  <RecentSessions sessions={sessions} apps={apps} />
                </div>
```

Replace with:
```tsx
                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-12">
                    <div className="card-glow" />
                    <div className="card-title">最近会话</div>
                    <RecentSessions sessions={sessions} apps={apps} />
                  </div>
                </div>
```

- [ ] **Step 5: 调整 CategoryBars 组件样式**

在 `CategoryBars` 组件中，调整 `progress-bar` 填充为渐变：

Find:
```tsx
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (cat.total_duration / total) * 100 : 0}%`, backgroundColor: cat.category_color ?? "#94a3b8" }} />
          </div>
```

Replace with:
```tsx
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (cat.total_duration / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${cat.category_color ?? "#94a3b8"}, var(--accent-soft))` }} />
          </div>
```

- [ ] **Step 6: 调整 TopAppsList 组件样式**

在 `TopAppsList` 组件中，类似地更新 progress bar：

Find:
```tsx
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (app.total_duration / total) * 100 : 0}%`, backgroundColor: app.app_color }} />
          </div>
```

Replace with:
```tsx
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (app.total_duration / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${app.app_color}, var(--accent-soft))` }} />
          </div>
```

- [ ] **Step 7: 调整 HourlyChart bar 样式**

在 `HourlyChart` 组件中，更新 bar 样式为新的 hourly-bar 类：

Find the bar rendering div (around line 65):
```tsx
                <div style={{
                  height: `${Math.max(height, height > 0 ? 2 : 0)}%`,
                  backgroundColor: "var(--accent)", borderRadius: "2px 2px 0 0",
                  opacity: height > 0 ? 0.85 : 0.15, minHeight: height > 0 ? 2 : 0,
                }} title={`${i}:00 — ${formatDuration(hourData?.duration || 0)}`} />
```

Replace with:
```tsx
                <div
                  className={`hourly-bar ${height === 0 ? 'empty' : ''}`}
                  style={{
                    height: `${Math.max(height, height > 0 ? 3 : 0)}%`,
                    minHeight: height > 0 ? 3 : 3,
                  }}
                  title={`${i}:00 — ${formatDuration(hourData?.duration || 0)}`}
                />
```

- [ ] **Step 8: 验证 Overview 页面**

运行 `npm run dev`，确认：
- Today 视图有 Bento Grid 布局（不规则卡片大小）
- Stat cards 顶部有 accent 渐变装饰线
- 卡片 hover 时有上浮 + glow 效果
- 24小时柱状图有渐变和顶部高光

- [ ] **Step 9: Commit**

```bash
git add src/pages/Overview.tsx
git commit -m "feat: refactor Overview into Bento Grid layout with insight cards"
```

---

## Task 6: 适配 Activity.tsx

**Files:**
- Modify: `src/pages/Activity.tsx`

- [ ] **Step 1: 调整 card 内边距和边框**

Find:
```tsx
            <div className="card" style={{ width: 280, flexShrink: 0, alignSelf: "flex-start" }}>
```

Replace with:
```tsx
            <div className="card" style={{ width: 280, flexShrink: 0, alignSelf: "flex-start", padding: 16 }}>
```

- [ ] **Step 2: 调整时间线 card**

Find:
```tsx
              <div className="card" style={{ overflow: "hidden" }}>
```

Replace with:
```tsx
              <div className="card" style={{ overflow: "hidden", padding: 16 }}>
                <div className="card-glow" />
```

- [ ] **Step 3: 调整应用使用列表 card**

Find:
```tsx
              <div className="card">
```

Replace with:
```tsx
              <div className="card">
                <div className="card-glow" />
```

- [ ] **Step 4: 更新进度条样式**

Find:
```tsx
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${total > 0 ? (s.total_duration / total) * 100 : 0}%`, backgroundColor: s.app_color }} />
                        </div>
```

Replace with:
```tsx
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${total > 0 ? (s.total_duration / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${s.app_color}, var(--accent-soft))` }} />
                        </div>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Activity.tsx
git commit -m "style: adapt Activity page to new card and progress-bar styles"
```

---

## Task 7: 适配 Stats.tsx

**Files:**
- Modify: `src/pages/Stats.tsx`

- [ ] **Step 1: 更新 Recharts 颜色为 accent 系**

Find:
```tsx
  const COLORS = ["#B4A0FF","#E8A0FF","#A0C0FF","#FFB6C1","#C8A0E0","#D8B0FF","#E0B0F0","#C0B0E8"];
```

Replace with:
```tsx
  const COLORS = ["#6366F1","#818CF8","#4F46E5","#A5B4FC","#4338CA","#3730A3","#C7D2FE","#312E81"];
```

- [ ] **Step 2: 给每个 card 添加 card-glow**

Find the three `.card` containers in `Stats` and add `<div className="card-glow" />` as first child of each.

For the first card (年度活跃热力图):
```tsx
        <div className="card">
          <div className="card-glow" />
          <div className="card-title">年度活跃热力图 · {new Date().getFullYear()}</div>
```

For the second card (使用趋势):
```tsx
        <div className="card">
          <div className="card-glow" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
```

For the third card (累计使用排行):
```tsx
        <div className="card">
          <div className="card-glow" />
          <div className="card-title">累计使用排行</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Stats.tsx
git commit -m "style: update Stats colors to indigo palette, add card glows"
```

---

## Task 8: 适配 Settings.tsx

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: 给每个 settings card 添加 card-glow**

在 `SettingsPage` return 的 JSX 中，找到每个 `<div className="card">`，在其第一个子元素之前插入 `<div className="card-glow" />`。

共有 7 个 card，逐个添加。例如第一个：
```tsx
        <div className="card">
          <div className="card-glow" />
          <div className="card-title">追踪设置</div>
```

- [ ] **Step 2: 更新 EditAppModal 的 card 样式**

Find:
```tsx
      <div className="card" style={{ width: 360, boxShadow: "var(--shadow-float)" }}>
```

Replace with:
```tsx
      <div className="card" style={{ width: 360 }}>
        <div className="card-glow" />
```

- [ ] **Step 3: 更新颜色预设按钮样式**

Find the color preset button style block (around line 307):
```tsx
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${p.g1}, ${p.g2})`,
                  border: colorPreset === p.id ? "3px solid var(--text-primary)" : "2px solid var(--border)",
```

Replace with:
```tsx
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${p.g1}, ${p.g2})`,
                  border: colorPreset === p.id ? "3px solid var(--text-primary)" : "2px solid var(--hairline)",
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "style: adapt Settings page to new card styles with glows"
```

---

## Task 9: 创建变更记录

**Files:**
- Create: `docs/变更记录/Chrona_UI重设计_Linear风格_2026-05-31.md`

- [ ] **Step 1: 按规则创建变更记录文件**

```markdown
# Chrona UI 重设计 — Linear 风格

## 基本信息
- **时间**: 2026-05-31
- **修改文件**:
  - `src/App.css`
  - `src/App.tsx`
  - `src/pages/Overview.tsx`
  - `src/pages/Activity.tsx`
  - `src/pages/Stats.tsx`
  - `src/pages/Settings.tsx`
  - `src/colorThemes.ts`
  - `src/theme.ts`

## 根因分析
- 问题: 界面布局为标准的 sidebar + header + 等宽 card grid，视觉风格类似后台管理页，缺乏设计感和品牌辨识度
- 原因: 早期 MVP 阶段优先功能实现，未投入设计系统建设；卡片使用 shadow 而非 hairline 分隔，整体偏 flat 无层次

## 修改详情

### 文件: src/App.css (全面重写)

**BEFORE:** 旧 Apple 风格主题，以白色/浅灰为主，card 使用 shadow，sidebar 220px，header 56px

**AFTER:** Linear 式 warm dark 主题系统
- 新增背景渐变层（径向 ambient light + 对角渐变）
- 新色彩变量：--ground, --surface-1/2/3, --hairline, --accent 等
- Card 质感：顶部高光伪元素 + hover 浮起 + glow 效果
- Stat Card：accent 渐变顶部装饰线
- Bento Grid：12 列不规则布局
- 新组件类：stat-row, bento, span-3~12, hourly-bar, session-row 等

### 文件: src/App.tsx (结构调整)

**BEFORE:** sidebar 220px，含 "Chrona" 文字 logo，导出按钮在 nav 区域内

**AFTER:** sidebar 200px，仅图标 logo，导出按钮移至 sidebar-footer，新增 bg-layer div

### 文件: src/pages/Overview.tsx (布局重构)

**BEFORE:** grid-2 / grid-3 等宽卡片网格

**AFTER:**
- 统计卡片独立 stat-row
- Bento Grid：应用占比(span5) + 分类分布(span4) + 应用排行(span3)
- Bento Grid：24小时分布(span7) + 今日洞察(span5)
- 最近会话全宽 span12
- 新增"今日洞察"卡片

### 文件: src/colorThemes.ts

**BEFORE:** 薰衣草紫(lavender)为默认 preset

**AFTER:** 靛蓝(indigo)为默认，更新所有预设为现代饱和色系

## 解决方案
引入 Linear-style 设计系统：warm dark 底层 + hairline 分隔 + 单一 accent 强调 + Bento 不规则网格 + 卡片 hover 动效，将"后台报表"气质提升为"精密桌面工具"。
```

- [ ] **Step 2: Commit**

```bash
git add docs/变更记录/
git commit -m "docs: add change log for UI redesign"
```

---

## Task 10: 最终验证

- [ ] **Step 1: 类型检查**

Run: `npx tsc -b --noEmit`
Expected: No type errors

- [ ] **Step 2: 启动应用并全面验证**

Run: `npm run tauri dev` (或 `npm run dev`)

验证清单：
- [ ] 深色主题：背景有微妙的紫 ambient light（左上亮、右下暗）
- [ ] 侧边栏：200px 宽，仅图标 logo，无 "Chrona" 文字
- [ ] Active nav：左侧 2.5px accent 竖线带 glow shadow
- [ ] 导出按钮：在 sidebar 底部 footer 区域
- [ ] Header：48px 高，无底部边框
- [ ] Overview 统计卡片：3 列，顶部有 accent 渐变装饰线
- [ ] Bento Grid：卡片大小不一致（5+4+3 / 7+5 / 12）
- [ ] Card hover：上浮 1px + 边框变亮 + 内部 glow 浮现
- [ ] 24小时柱状图：渐变填充 + 顶部高光
- [ ] 进度条：3px 高，渐变填充
- [ ] 颜色点：同色 glow shadow
- [ ] 会话行 hover：整行背景高亮
- [ ] 浅色主题切换：背景变白，文字变深，card 样式适配
- [ ] Activity 页面：日历 + 时间线 + 列表正常显示
- [ ] Stats 页面：热力图 + 趋势图 + 排行榜正常显示
- [ ] Settings 页面：所有设置项可正常操作

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final polish after visual verification"
```

---

## Self-Review Checklist

### Spec coverage
- [x] 背景渐变层 → Task 1 CSS
- [x] 色彩系统 → Task 1 CSS + Task 2/3
- [x] 排版 → Task 1 CSS (font-family, size, weight)
- [x] 间距/圆角 → Task 1 CSS
- [x] 阴影/边框 → Task 1 CSS
- [x] Sidebar 重构 → Task 4
- [x] Bento Grid → Task 5
- [x] Stat cards → Task 1 CSS + Task 5
- [x] Card glow/hover → Task 1 CSS
- [x] Progress bar 渐变 → Tasks 5/6/7
- [x] Hourly bar 渐变 → Tasks 1/5
- [x] Color dot glow → Task 1 CSS
- [x] 其他页面适配 → Tasks 6/7/8
- [x] 动效 → Task 1 CSS
- [x] 浅色主题 → Task 1 CSS `[data-theme="light"]` 规则

### Placeholder scan
- [x] 无 "TBD"/"TODO"
- [x] 每个代码步骤包含完整代码
- [x] 无 "similar to Task N" 引用

### Type consistency
- [x] CSS class 名在 plan 中一致：`card-glow`, `stat-row`, `bento`, `hourly-bar`, `duration-mono`, `color-dot`
- [x] 颜色 token 一致：`--accent`, `--accent-soft`, `--hairline`
- [x] React 组件中的 `className` 与 CSS 定义匹配
