# Chrona 项目审计报告

**日期**: 2026-05-27 | **版本**: 0.1.0 | **审计范围**: 全代码库

---

## 一、项目概览

Chrona 是一个基于 Tauri v2 的 Windows 桌面应用，用于自动追踪前台窗口活动并生成时间统计。当前处于早期开发阶段（v0.1.0），核心追踪功能和基础 UI 已实现。

| 维度 | 状态 |
|------|------|
| 核心追踪（Tracker） | ✅ 已实现 + 合并逻辑已修复 |
| 数据库 & Schema | ✅ 已实现 + 单元测试覆盖 |
| 前端页面 | ✅ 6 个页面全部实现 + Loading/Error UI |
| Tauri 配置 | ✅ capabilities 已添加 |
| 需求覆盖率 | ⚠️ ~70% |

---

## 二、🔴 严重问题（Critical）

### C1. ~~缺少 Tauri v2 Capabilities 文件~~ ✅ 已修复

**文件**: `src-tauri/capabilities/default.json` — **已创建**

已添加以下权限：
- `core:default`
- `dialog:default`, `dialog:allow-open`, `dialog:allow-save`
- `fs:default`

---

### C2. ~~`update_app` 无法清除应用的分类~~ ✅ 已修复

**文件**: `src-tauri/src/db/queries.rs:365-377`

已修改为 `match category_id` 模式：
```rust
match category_id {
    Some(c) => { conn.execute("UPDATE apps SET category_id = ?1 WHERE id = ?2", params![c, id])?; }
    None => { conn.execute("UPDATE apps SET category_id = NULL WHERE id = ?2", params![id])?; }
}
```

前端发送 `category_id: null` 时，现在会正确将分类设置为 NULL。

---

### C3. ~~`import_data` 只导入了 settings~~ ✅ 已修复

**文件**: `src-tauri/src/commands/settings.rs:38-104`

已添加完整的导入逻辑：
- **Apps**: 按 `exe_path` 去重，跳过已存在的记录
- **Categories**: 按 `name` 去重，跳过已存在的记录
- **Settings**: INSERT OR REPLACE（原有逻辑）
- 所有操作包裹在事务中（原子性）

---

### C4. ~~系统托盘缺少右键菜单~~ ✅ 已修复

**文件**: `src-tauri/src/main.rs:60-101`

已添加：
- 右键菜单："显示 Chrona" / 分隔线 / "退出"
- 左键点击行为不变（显示并聚焦窗口）
- "退出"调用 `tracker.stop()` 优雅退出

---

## 三、🟠 高优先级问题（High）

### H1. ~~未使用的依赖 `react-router-dom`~~ ✅ 已修复

已从 `package.json` 移除，`npm install` 更新了 lockfile。

---

### H2. ~~Merger 合并逻辑被架空~~ ✅ 已修复

**文件**: `src-tauri/src/tracker/merger.rs` + `src-tauri/src/tracker/mod.rs`

已添加 `should_merge()` 和 `record_switch()` 方法。Tracker 主循环重构为：
1. Same-app-same-title 优化（不变）
2. **新增**: `should_merge()` 检查 — 如果在合并间隔内，扩展已有 session
3. 正常流程：结束旧 session + 创建新 session

合并间隔现在真正生效：A → B → A 在 30s 内会产生 1 条 session 而非 2 条。

---

### H3. 多处 `.unwrap()` 存在 panic 风险 ⚠️ 部分修复

**文件**: `src-tauri/src/db/queries.rs`

已提取 `MS_PER_HOUR` / `MS_PER_DAY` 常量，减少了魔法数字。但日期解析的 `unwrap()` 仍在以下位置：
- `get_sessions_by_date` (行 118-120)
- `get_app_usage_for_date` (行 151-153)
- `get_hourly_distribution` (行 185-187)
- `get_heatmap_data` (行 240-243)
- `get_category_usage_for_date` (行 307)

建议后续改为 `Result` 返回或 `unwrap_or` 处理。

---

### H4. ~~Tracker 线程在应用退出时泄露~~ ✅ 已修复

**文件**: `src-tauri/src/tracker/mod.rs:124-133`

已在 tracker 线程退出时添加清理逻辑：
```rust
if let Some(active) = merger.active.take() {
    let db_lock = db.lock().unwrap();
    let now = chrono::Local::now().timestamp_millis();
    let _ = queries::update_session_end(conn, active.session_id, now, now - active.started_at);
}
```

托盘"退出"菜单调用 `tracker.stop()` → 设置 `running=false` → 线程退出时自动清理活跃 session。

---

## 四、🟡 中优先级问题（Medium）

### M1. 用户排除列表覆盖系统黑名单

**文件**: `src-tauri/src/tracker/mod.rs:164-178`

设计意图是"用户自定义了就全用用户的"。用户配置了 `excluded_processes` 后，内置 `SYSTEM_PROCESS_BLACKLIST` 完全被忽略。文档应明确说明此行为，或改为追加模式。

---

### M2. `continuous_apps` 匹配逻辑过于宽泛

**文件**: `src-tauri/src/tracker/mod.rs:181-189`

使用 `exe_path.to_lowercase().contains(&keyword)` 对整个路径做子串匹配。关键词 `code` 会匹配 `C:\Users\xxx\vscode\...`。建议改为只匹配文件名部分。

---

### M3. 空闲结束时不自动恢复 Session

**文件**: `src-tauri/src/tracker/mod.rs:43-56`

当检测到空闲时结束当前 session，但用户恢复操作后不自动创建新 session。如果用户在同一个应用中恢复操作，tracker 不会知道用户已回来，直到检测到不同的前台窗口。

---

### M4. `auto_start`（开机自启）未实现

需求文档要求"开机自启，可选，默认开启"。项目中：
- 没有任何开机自启实现（注册表 Run 键或 Windows 启动文件夹）
- `DEFAULT_SETTINGS.auto_start` 常量存在但无实际效果
- Settings 页面没有相关 UI

---

### M5. `检查更新` 功能完全缺失

需求文档要求的应用内更新检查功能未实现。Tauri v2 有官方的 `tauri-plugin-updater` 可集成。

---

### M6. Settings.tsx 中硬编码默认排除列表

**文件**: `src/pages/Settings.tsx:14-16`

默认排除列表在前端硬编码（`"explorer,msrdc,searchhost,..."`），后端有独立的 `SYSTEM_PROCESS_BLACKLIST`。两处可能不一致，应以单一来源为准。

---

### M7. CSP 安全策略被禁用

**文件**: `src-tauri/tauri.conf.json:26-28`

```json
"security": { "csp": null }
```

生产环境中应配置合理的内容安全策略。

---

### M8. ~~`$schema` 指向非官方仓库~~ ✅ 已修复

已改为官方 URL: `https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json`

---

## 五、🟢 低优先级问题（Low）

### L1. ~~`formatDuration` 函数重复定义 4 次~~ ✅ 已修复

已提取到 `src/utils.ts`，包含：
- `formatDuration(ms)` — h+m 格式（Today, History, Stats 使用）
- `formatDurationPrecise(ms)` — h+m+s 格式（Timeline 使用）
- `MS_PER_HOUR`, `MS_PER_DAY` 常量

---

### L2. ~~缺少 Loading 状态~~ ✅ 已修复

已创建 `src/components/LoadingSpinner.tsx`，所有页面添加了 loading 状态管理。

---

### L3. ~~错误处理仅限 `console.error`~~ ✅ 已修复

已创建 `src/components/ErrorBanner.tsx`，所有页面的 `invoke()` 失败时显示红色错误横幅 + 重试按钮。

---

### L4. 缺少无障碍（Accessibility）支持

- 所有按钮缺少 `aria-label`
- 导航按钮无键盘导航支持
- 颜色选择器无文本替代

---

### L5. 全局禁止文本选择

```css
body { user-select: none; }
```

可能影响用户在统计页面选择/复制数据。

---

### L6. ~~`upsert_app` 函数未使用~~ ✅ 已修复

已从 `queries.rs` 删除。

---

### L7. ~~硬编码的 86400000 魔法数字~~ ✅ 已修复

已提取为 `MS_PER_HOUR` / `MS_PER_DAY` 常量（Rust 和 TypeScript 两侧）。

---

### L8. `.gitignore` 中的 `reference/` 目录不存在

无害但冗余。

---

## 六、需求对比（需求文档 vs 实际实现）

| 需求 | 状态 | 备注 |
|------|------|------|
| 自动追踪（后台轮询） | ✅ | 已实现 |
| 获取窗口标题 | ✅ | 已实现 |
| 合并间隔 | ✅ | 已修复，合并逻辑现在正确生效 |
| 持续记录模式 | ⚠️ | 已实现但匹配逻辑需改进（见 M2） |
| 空闲检测 | ⚠️ | 检测已实现，但恢复处理缺失（见 M3） |
| 系统托盘 | ✅ | 已修复，右键菜单已添加 |
| 最小化到托盘销毁主窗口 | ✅ | 已实现（hide 非 destroy） |
| **今天页面** | ✅ | 饼图、时长列表、24h 分布图 + Loading/Error |
| **时间线页面** | ✅ | 按应用分组、悬浮详情 + Loading/Error |
| **历史页面** | ✅ | 日历选择、日期查看 + Loading/Error |
| **数据统计** | ✅ | 趋势图、热力图、排行 + Loading/Error |
| **应用管理** | ✅ | 编辑/删除可用，分类移除已修复 |
| 分类管理 | ✅ | 创建/删除分类 |
| **设置 - 合并间隔** | ✅ | |
| **设置 - 持续记录应用** | ✅ | |
| **设置 - 主题** | ✅ | 浅色/深色 |
| **设置 - 语言** | ❌ | 类型定义存在，store 有 setLanguage，但无实际 UI 切换逻辑（所有文案硬编码中文） |
| **设置 - 数据备份** | ✅ | 导出/导入均已实现（含 apps/categories） |
| **设置 - 数据恢复** | ✅ | 同上 |
| **设置 - 检查更新** | ❌ | 完全未实现（见 M5） |
| 开机自启 | ❌ | 完全未实现（见 M4） |
| 排除进程 | ✅ | 已实现 |
| 内存 < 50MB（托盘时） | 未知 | 未测试 |
| 浏览器标签页标题追踪 | ❌ | 进阶功能，未实现 |
| IDE 文件名追踪 | ❌ | 进阶功能，未实现 |
| 应用使用目标与提醒 | ❌ | 进阶功能，未实现 |

---

## 七、剩余问题优先级路线图

### 第一阶段（核心功能改进）

1. **改进空闲恢复逻辑**（M3）— 空闲结束后自动恢复当前窗口的 session
2. **改进 `continuous_apps` 匹配**（M2）— 改为只匹配文件名部分
3. **改进排除列表行为**（M1）— 改为追加模式或明确文档说明

### 第二阶段（需求补齐）

4. **实现开机自启**（M4）— 集成 Windows 注册表 Run 键
5. **实现检查更新**（M5）— 集成 `tauri-plugin-updater`
6. **实现语言切换 UI** — 所有文案国际化（i18n）

### 第三阶段（安全 & 体验）

7. **配置 CSP 策略**（M7）— 生产环境安全加固
8. **添加 Accessibility**（L4）— ARIA 标签、键盘导航
9. **改进 `unwrap()` 错误处理**（H3）— 所有日期解析改为 Result 返回

---

## 八、技术债务汇总

| 类别 | 修复前 | 修复后 |
|------|--------|--------|
| `unwrap()` / `expect()` | 17 处 | 12 处（5 处已改为常量） |
| 未使用代码 | 1 函数 + 1 依赖 | 0 |
| 重复代码 | `formatDuration` × 4 | 0 |
| 缺少错误处理 UI | 全局 | 已添加 |
| 缺少 Loading 状态 | 全局 | 已添加 |
| 魔法数字 | 3+ 处 | 0（已提取常量） |
| 单元测试 | 0 | 14 个（merger + queries） |

---

## 九、测试覆盖

| 模块 | 测试数 | 覆盖内容 |
|------|--------|----------|
| `merger.rs` | 5 | 合并间隔内/外、不同应用、状态更新 |
| `queries.rs` | 9 | 创建/查询应用、session、分类管理、设置、常量验证 |
| **总计** | **14** | 运行命令: `cargo test` |
