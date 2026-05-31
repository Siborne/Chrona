# Chrona UI 重设计 — 设计文档

## 1. 设计方向

**锚点**: Linear-style modern tool aesthetic — warm dark ground, hairline detail, restraint as confidence  
**学派**: Modern Tool / Builder SaaS

Chrona 当前界面是标准的 sidebar + header + card grid 后台管理页布局，功能完整但缺乏个性与质感。本次重设计目标是将视觉气质从"后台报表"提升为"精密桌面工具"。

---

## 2. 主题策略

**深色为主，浅色为辅**。深色主题采用 Linear 式 warm dark 调色板，浅色主题作为日间模式变体重新推导。默认启动深色主题。

---

## 3. 色彩系统

### 深色主题（默认）

| Token | 值 | 用途 |
|-------|-----|------|
| `--ground` | `#07080A` | 页面底层背景 |
| `--ground-glow` | `#0E1018` | 渐变背景光晕层 |
| `--surface-1` | `#13141A` | 卡片底层 |
| `--surface-2` | `#1A1B22` | hover/抬升态 |
| `--surface-3` | `#22232C` | 更深的层级 |
| `--surface-highlight` | `rgba(255,255,255,0.03)` | 卡片顶部高光覆盖 |
| `--hairline` | `rgba(255,255,255,0.045)` | 默认分隔线/边框 |
| `--hairline-strong` | `rgba(255,255,255,0.08)` | hover/聚焦时边框 |
| `--text-primary` | `#F0F1F5` | 主文字 |
| `--text-secondary` | `#9CA3AF` | 次要文字 |
| `--text-muted` | `#5C6270` | 最弱文字/标签 |
| `--accent` | `#6366F1` | 主强调色 |
| `--accent-soft` | `#818CF8` | 强调色亮部 |
| `--accent-dim` | `rgba(99,102,241,0.12)` | 强调色背景填充 |

### 背景渐变层

页面底层叠加三层背景：
1. `radial-gradient(ellipse 80% 60% at 15% 10%, rgba(99,102,241,0.07) 0%, transparent 60%)` — 左上方靛紫 ambient light
2. `radial-gradient(ellipse 60% 50% at 85% 85%, rgba(139,92,246,0.04) 0%, transparent 50%)` — 右下方微弱紫辉
3. `linear-gradient(160deg, #0C0E14 0%, #07080A 40%, #090A10 70%, #0D0E16 100%)` — 整体暗色渐变基底

### 浅色主题（日间模式）

浅色主题待实现，基础推导如下（具体值在实现阶段微调）：

| Token | 推导值 |
|-------|--------|
| `--ground` | `#FAFAFA` |
| `--surface-1` | `#FFFFFF` |
| `--surface-2` | `#F3F4F6` |
| `--hairline` | `rgba(0,0,0,0.05)` |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#6B7280` |
| `--text-muted` | `#9CA3AF` |
| `--accent` | `#6366F1` |

---

## 4. 排版

| 层级 | 字体 | 大小 | 字重 | 附加 |
|------|------|------|------|------|
| Display（大数字） | Inter Tight | 30-32px | 700 | letter-spacing: -0.03em, 渐变文字填充 |
| Page Title | Inter Tight | 16px | 600 | letter-spacing: -0.02em |
| Card Title | Inter | 11px | 500 | 大写, letter-spacing: 0.04em, 左侧 accent 竖线 |
| Body | Inter | 14px | 400 | line-height: 1.55 |
| Mono（时长） | JetBrains Mono | 11px | 500 | tabular-nums |
| Label | Inter | 12px | 400 | --text-secondary |
| Muted | Inter | 11px | 400 | --text-muted |

---

## 5. 间距系统

Base unit: 4px

| Token | 值 | 用途 |
|-------|-----|------|
| xs | 4px | 微小间隙 |
| sm | 8px | 紧凑元素间距 |
| md | 12px | 卡片/网格间距 |
| lg | 16-18px | 卡片内边距 |
| xl | 24-28px | 页面水平边距 |

---

## 6. 圆角策略

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 8px | 按钮、小元素、nav item |
| `--radius-md` | 14px | 中等卡片 |
| `--radius-lg` | 18px | 大面板（极少使用） |

**原则**: 桌面应用窗口通常较小，圆角比 Linear 更收敛（Linear 用 16px，Chrona 用 14px）。

---

## 7. 阴影与边框

**禁止粗重 card shadow**。所有分隔用 1px hairline border。

卡片边框结构：
- 默认: `1px solid var(--hairline)`，顶部边框稍亮 `rgba(255,255,255,0.07)`
- Hover: 边框变亮，顶部 `rgba(255,255,255,0.12)`
- 顶部高光伪元素: 一条从透明到半白再到透明的水平线，模拟光源

Hover 浮起效果：
```css
transform: translateY(-1px);
box-shadow:
  0 4px 20px rgba(0,0,0,0.3),
  0 0 0 1px rgba(255,255,255,0.04),
  inset 0 1px 0 rgba(255,255,255,0.04);
```

---

## 8. 布局重构

### 当前布局
```
[Sidebar 220px] [Header 56px] [Card Grid 2-3列等宽]
```

### 新布局
```
[Sidebar 200px] [Header 48px]
                    └── Stat Row（3列等高）
                    └── Bento Grid（不规则流动布局）
                          ├── 应用占比（span 5） + 分类分布（span 4） + 应用排行（span 3）
                          ├── 24小时分布（span 7） + 今日洞察（span 5）
                          └── 最近会话（span 12）
```

### 关键变化
1. **侧边栏收窄**: 220px → 200px，去掉 Chrona 文字 logo，只保留渐变色图标
2. **侧边栏分隔线**: 从全高实线改为居中渐变线 `linear-gradient(180deg, transparent, hairline, transparent)`
3. **Header 压缩**: 56px → 48px，取消底部边框
4. **内容区边距**: padding 从 24px 调整为 28px（更透气）
5. **统计卡片独立一行**: 作为 hero 入口，卡片顶部带 accent 渐变装饰线
6. **Bento Grid**: 12 列网格，卡片按内容重要性分配不同跨度，打破等宽单调感

---

## 9. 组件规范

### 9.1 Sidebar Nav Item

- 默认: `color: --text-secondary`, 无背景
- Hover: `background: rgba(255,255,255,0.04)`, `color: --text-primary`
- Active: `background: rgba(99,102,241,0.10)`, `color: --accent-soft`, 左侧 2.5px accent 竖线带 glow shadow
- Active indicator glow: `box-shadow: 0 0 8px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.2)`

### 9.2 Card

多层背景叠加：
```css
background:
  linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, transparent 100%),
  var(--surface-1);
border: 1px solid var(--hairline);
border-top-color: rgba(255,255,255,0.07);
```

顶部高光伪元素：居中水平线 `linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`

Hover 时内部出现 radial gradient glow（`.card-glow` 元素 opacity 0 → 1）

### 9.3 Stat Card（Hero 统计卡片）

在普通 card 基础上：
- 额外叠加 `linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 50%)`
- 顶部伪元素为 accent 色渐变线
- Hover 时 accent border glow + 更大的阴影扩散

### 9.4 Button

- 默认: `background: rgba(255,255,255,0.03)`, `border: 1px solid var(--hairline)`
- Primary: `background: --accent`, 微 shadow `0 1px 3px rgba(99,102,241,0.25)`
- Hover: 背景变亮，border 变亮

### 9.5 Progress Bar

- 背景: `rgba(255,255,255,0.05)`
- 填充: `linear-gradient(90deg, accent, accent-soft)`
- 高度: 3px
- 过渡: 600ms ease

### 9.6 Hourly Bar

- 填充: `linear-gradient(180deg, --accent-soft 0%, --accent 100%)`
- 顶部高光伪元素: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)`
- Hover: `filter: brightness(1.2)`
- 空值: `rgba(255,255,255,0.04)`, opacity 0.4

### 9.7 Color Dot

- 尺寸: 7x7px
- 添加 `box-shadow: 0 0 6px currentColor` 制造同色 glow

---

## 10. 动效规范

| 场景 | 时长 | 曲线 |
|------|------|------|
| Hover 状态变化 | 180ms | ease-out |
| 布局切换/页面切换 | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Progress bar 宽度变化 | 600ms | 同上 |
| Card glow 浮现 | 400ms | 同上 |
| Card hover 上浮 | 180ms | ease-out |
| 数值变化 | 平滑过渡 | — |

---

## 11. 涉及文件变更

### CSS 文件
- `src/App.css` — 全面重写，替换现有主题系统

### React 组件
- `src/App.tsx` — 调整 sidebar 结构（去掉 logo 文字，改 active indicator 样式）
- `src/pages/Overview.tsx` — 重构为 Bento Grid 布局
- `src/pages/Activity.tsx` — 适配新色彩与卡片样式
- `src/pages/Stats.tsx` — 适配新色彩与卡片样式
- `src/pages/Settings.tsx` — 适配新色彩与卡片样式

### 其他
- `src/colorThemes.ts` — 更新渐变色映射到新的 accent 系统
- `src/theme.ts` — 更新时间主题颜色适配新调色板

---

## 12. 风险与注意事项

1. **recharts 图表颜色**: Overview 和 Stats 中的 recharts 图表需要更新颜色配置，使用新的 accent 色系
2. **浅色主题**: 本设计以深色为主，浅色主题需要在实现阶段单独推导验证
3. **背景渐变层性能**: 多层 radial-gradient 在低端设备可能有性能影响，如发现问题可简化为单层
4. **Tauri 窗口大小**: 当前设计基于 1200px+ 宽度，较小窗口下 Bento Grid 可能需要响应式降级

---

## 13. 参考

- [Linear App](https://linear.app)
- `references/style-recipes/linear.md`
- v0.2 原型: `.claude/design-v0/chrona-v0.html`
