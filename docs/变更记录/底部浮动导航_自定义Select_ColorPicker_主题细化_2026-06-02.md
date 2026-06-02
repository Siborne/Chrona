# 底部浮动导航 + 自定义 Select + ColorPicker + 主题细化

**时间**: 2026-06-02

**修改文件**:
- `src-tauri/capabilities/default.json`
- `src/App.css`
- `src/App.tsx`
- `src/colorThemes.ts`
- `src/theme.ts`
- `src/store/index.ts`
- `src/pages/Settings.tsx`
- `src/pages/AppMgmt.tsx`
- `src/pages/Overview.tsx`
- `src/pages/Stats.tsx`
- `src/components/Select.tsx` (新建)
- `src/components/ColorPicker.tsx` (新建)

---

## 根因分析

### 1. 导航栏样式单一
原左侧边栏导航缺乏现代化设计，用户希望增加 iOS 风格的底部浮动胶囊导航作为可选布局。

### 2. 原生 select 深色主题不兼容
Windows 下原生 `<select>` 的 `<option>` 下拉菜单由系统渲染，深色主题下弹出白色背景 + 浅色文字，完全不可读。

### 3. 原生 input[type=color] 样式丑陋
浏览器默认的颜色选择器在不同平台下样式差异大，视觉上与整体设计风格不统一。

### 4. 背景缺乏质感
深色主题下背景接近纯黑，缺少层次感和视觉深度。

### 5. 图表颜色单一
所有图表使用同一 accent 色的变体，视觉效果单调。

### 6. 标题栏按钮无权限
Tauri v2 的 window 操作需要显式声明权限，最小化/最大化/关闭按钮点击无响应。

---

## 修改详情

### 文件: `src/store/index.ts` (L1-L80)

**新增状态:**
- `navPosition: 'left' | 'bottom'` — 导航位置
- `fontFamily: 'wenkai' | 'noto' | 'inter' | 'system'` — 字体
- `fontWeight: number` — 字重
- `bgIntensity: number` — 背景强度
- `chartPalette: 'theme' | 'rainbow' | 'pastel' | 'vivid'` — 图表调色板
- `heatmapScheme: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan'` — 热力图方案

### 文件: `src/App.tsx` (L90-L200)

**AFTER:**
```tsx
function FloatingNav() {
  const { currentPage, setCurrentPage } = useAppStore();
  return (
    <nav className="floating-nav" role="navigation" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            className={`floating-nav-item ${isActive ? "active" : ""}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

根据 `navPosition` 条件渲染侧边栏或底部浮动导航。

### 文件: `src/App.css`

**新增 `.floating-nav`:**
```css
.floating-nav {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(1.8);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), ...;
}
```

**新增 `.segmented-control`:**
iOS 风格分段控制器，用于 Settings 页 tab 切换。

**新增背景层 `.bg-aurora` + `.bg-noise`:**
多层 radial-gradient 光晕 + 缓慢漂移动画 + SVG 噪点纹理。

**新增字体变量:**
```css
:root {
  --font-family: 'LXGW WenKai Screen', 'LXGW WenKai';
  --font-weight: 400;
}
[data-font="system"] { --font-family: ...; }
```

### 文件: `src/components/Select.tsx` (新建)

完全自定义下拉组件，替代原生 `<select>`:
- 使用 `createPortal` 渲染到 `document.body`，避免被父容器 `overflow: hidden` 裁剪
- `position: fixed` + `getBoundingClientRect` 计算位置
- 滚动/resize 时自动更新位置
- 深色/浅色主题下样式完全可控

### 文件: `src/components/ColorPicker.tsx` (新建)

自定义颜色选择器，替代原生 `<input type="color">`:
- 圆形色块触发器
- 弹窗：18 色预设网格 + 自定义颜色输入
- 同样使用 `createPortal` + `position: fixed`
- 选中状态有白色边框高亮

### 文件: `src/colorThemes.ts`

**新增调色板定义:**
```ts
export const CHART_PALETTES = {
  theme: [],
  rainbow: ["#FF6B6B", "#FFA94D", ...],
  pastel: ["#FFB3BA", "#FFDFBA", ...],
  vivid: ["#E03131", "#E8590C", ...],
};
```

**新增热力图方案:**
```ts
export const HEATMAP_SCHEMES = {
  indigo:  { level0: ..., level1: ..., ... },
  emerald: { ... },
  rose:    { ... },
  amber:   { ... },
  cyan:    { ... },
};
```

### 文件: `src-tauri/capabilities/default.json`

**AFTER:**
```json
"permissions": [
  "core:default",
  "core:window:allow-minimize",
  "core:window:allow-toggle-maximize",
  "core:window:allow-close",
  "core:window:allow-start-dragging",
  ...
]
```

### 文件: `src/pages/Settings.tsx`

外观 tab 新增控件:
- 字体选择（4 种）
- 字重选择（中等 500 / 粗体 700）
- 导航位置切换
- 背景强度滑块（0%-100%）
- 背景图片选择（文件对话框 + base64 存储）
- 图表调色板（4 种）
- 热力图颜色（5 种方案）

### 文件: `src/pages/Stats.tsx`

累计使用排行卡片增加内部滚动容器：
```tsx
<div style={{ overflowY: "auto", maxHeight: 320 }}>
  <table className="table">...</table>
</div>
```

---

## 解决方案

1. **导航**: 保留左侧边栏，新增底部浮动胶囊导航作为可选布局
2. **Select**: 完全自定义组件，Portal + fixed 定位避免裁剪，脱离系统渲染
3. **ColorPicker**: 预设颜色网格 + 自定义输入，视觉风格统一
4. **背景**: 极光光晕（CSS 动画）+ 噪点纹理（SVG filter）双层叠加
5. **图表颜色**: 全局 accent 色保持不变，图表独立使用调色板系统
6. **热力图**: 从 accent 色绑定改为独立方案系统，通过 CSS 变量切换
7. **权限**: Tauri v2 capabilities 显式声明 window 操作权限
