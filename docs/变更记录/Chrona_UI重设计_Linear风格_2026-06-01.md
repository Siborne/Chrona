# Chrona UI 重设计 — Linear 风格

## 基本信息
- **时间**: 2026-06-01
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

### 文件: src/pages/Stats.tsx
- Heatmap 卡片 minHeight: 200px，TrendChart 卡片 minHeight: 400px，排行卡片 minHeight: 300px
- TrendChart 高度从 260px 增加到 320px
- Heatmap cell 使用变量尺寸控制，显式设置 minHeight

### 文件: src/pages/Settings.tsx
- 新增顶部 Tab 导航（追踪 / 外观 / 应用 / 系统），解决页面过长问题
- 各 tab 卡片加 maxWidth: 640px 约束防止过宽
- 主题和色彩合并到"外观"tab

### 文件: src/colorThemes.ts (重写)
- `applyColorTheme` 完全重写：变量名从旧系统映射到新 CSS token（--accent-soft, --accent-dim, --accent-hover）
- 背景渐变色跟随主题色变化
- 移除不再使用的 deriveTheme/ThemeVars

### 文件: src/App.css (浅色模式修复)
- 浅色按钮：白色背景 + 可见边框 + 正常灰色文字，不再不可见
- 浅色卡片：gradient overlay + subtle box-shadow，不再 flat white
- 浅色 stat-card：双层渐变 + shadow
- 浅色背景层：微妙渐变色（不再纯透明）
- Select 下拉框：自定义箭头 SVG + hover/focus 态 + appearance:none

### 文件: src/pages/Settings.tsx
- 自定义颜色 UI 改为 chip 样式：色块 + hex 代码 + accent 边框选中态

### 文件: src/App.css (全面重写, ~880行)

**BEFORE:** 旧 Apple 风格主题，以白色/浅灰为主，card 使用 shadow，sidebar 220px，header 56px

**AFTER:** Linear 式 warm dark 主题系统
- 新增背景渐变层（径向 ambient light + 对角渐变）
- 新色彩变量：--ground, --surface-1/2/3, --hairline, --accent 等
- Card 质感：顶部高光伪元素 + hover 浮起 + glow 效果
- Stat Card：accent 渐变顶部装饰线
- Bento Grid：12 列不规则布局
- 新组件类：stat-row, bento, span-3~12, hourly-bar, session-row, sidebar-greeting 等
- 浅色主题全量 CSS 变量覆盖

### 文件: src/App.tsx (结构调整)

**BEFORE:** sidebar 220px，含 "Chrona" 文字 logo，sidebar greeting 独立

**AFTER:** sidebar 200px，仅图标 logo (简化 SVG 时钟)，导出按钮移至 sidebar-footer，新增 bg-layer 背景层 div

### 文件: src/pages/Overview.tsx (布局重构)

**BEFORE:** grid-2 / grid-3 等宽卡片网格

**AFTER:**
- 统计卡片独立 stat-row（3列等高 stat-card）
- Bento Grid：应用占比(span5) + 分类分布(span4) + 应用排行(span3)
- Bento Grid：24小时分布(span7) + 今日洞察(span5)
- 最近会话全宽 span12
- 新增"今日洞察"卡片（专注领域 + 峰值时段提示）
- 7/14/30 天视图 WeeklySummary 改用 stat-row
- 所有 card 添加 card-glow 层
- HourlyChart bar 改用 hourly-bar CSS 类
- 进度条改用 gradient 填充
- RecentSessions 改用 session-row CSS 类
- 图表 COLORS 更新为 indigo 色系

### 文件: src/colorThemes.ts

**BEFORE:** 薰衣草紫(lavender)为默认 preset

**AFTER:** 靛蓝(indigo)为默认，更新所有预设为现代饱和色系（indigo/violet/rose/emerald/cyan/amber/coral/slate）

### 文件: src/theme.ts

**BEFORE:** purple 系时间渐变

**AFTER:** indigo 系时间渐变（从 #818CF8 到 #312E81）

## 解决方案
引入 Linear-style 设计系统：warm dark 底层 + hairline 分隔 + 单一 accent 强调 + Bento 不规则网格 + 卡片 hover 动效，将"后台报表"气质提升为"精密桌面工具"。
