# Chrona 技术架构文档

## 1. 技术选型

### 1.1 框架决策

经技术评估，选择 **Tauri v2**：

| 方案 | 结论 | 原因 |
|------|------|------|
| **Tauri v2** | ✅ 选用 | 原生托盘 API、自动更新、数据导入导出均有官方支持，开发效率最高 |
| GPUI | ❌ 排除 | 托盘需依赖非官方 fork，维护风险高 |
| egui / iced | ❌ 排除 | 无原生托盘支持，需大量自定义 |

### 1.2 技术栈

| 层 | 技术 |
|----|------|
| 后端语言 | Rust |
| 前端框架 | React + TypeScript |
| 桌面框架 | Tauri v2 |
| 数据库 | SQLite（via `rusqlite`） |
| 系统托盘 | Tauri 内置 tray API |
| Windows API | `windows-rs` |
| 序列化 | `serde` + `serde_json` |
| 时间处理 | `chrono` |
| 图表 | Recharts 或 ECharts |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Chrona 进程                        │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Tracker     │    │    UI Layer (React/TS)   │   │
│  │  (后台线程)   │    │                          │   │
│  │              │    │  Today / Timeline /      │   │
│  │  轮询前台窗口  │───▶│  History / Stats /       │   │
│  │  写入 SQLite  │    │  AppMgmt / Settings      │   │
│  └──────────────┘    └──────────────────────────┘   │
│         │                 │  Tauri invoke()         │
│         ▼                 ▼                         │
│  ┌──────────────────────────────────────┐           │
│  │           SQLite (本地)               │           │
│  │  sessions / apps / categories /      │           │
│  │  settings                            │           │
│  └──────────────────────────────────────┘           │
│                                                     │
│  ┌──────────────┐                                   │
│  │  系统托盘     │  ← Tauri tray API                 │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## 3. 核心模块

### 3.1 Tracker（追踪器）

独立后台线程，主循环：

```
每 1s:
  1. 调用 GetForegroundWindow() → HWND
  2. GetWindowThreadProcessId(hwnd) → PID
  3. OpenProcess + QueryFullProcessImageName → 进程路径
  4. GetWindowText(hwnd) → 窗口标题
  5. 与上一条记录对比：
     - 同一进程 → 延长当前 session
     - 不同进程 → 结束当前 session，开始新 session
  6. 合并间隔检查：若切换后在 merge_interval 内切回 → 合并
  7. 持续记录检查：白名单应用忽略空闲检测
  8. 写入 SQLite
```

**Windows API 调用链**:
```rust
// 获取前台窗口信息
GetForegroundWindow() -> HWND
GetWindowThreadProcessId(hwnd, &mut pid)
OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
QueryFullProcessImageNameW(handle, 0, &mut buf, &mut size)
GetWindowTextW(hwnd, &mut title_buf, MAX_PATH)
```

### 3.2 数据库层

**Schema**:

```sql
CREATE TABLE apps (
    id       INTEGER PRIMARY KEY,
    exe_path TEXT UNIQUE NOT NULL,
    name     TEXT NOT NULL,          -- 显示名，可自定义
    category_id INTEGER,
    color    TEXT DEFAULT '#888888'
);

CREATE TABLE categories (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT
);

CREATE TABLE sessions (
    id         INTEGER PRIMARY KEY,
    app_id     INTEGER NOT NULL REFERENCES apps(id),
    title      TEXT,                 -- 窗口标题（细粒度追踪）
    started_at INTEGER NOT NULL,     -- Unix timestamp ms
    ended_at   INTEGER,              -- NULL = 当前活跃
    duration   INTEGER               -- ms，冗余字段加速查询
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 查询优化索引
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sessions_app_id  ON sessions(app_id);
```

### 3.3 UI 层（React + Tauri）

页面路由使用 React Router，状态管理用 Zustand 或 React Context：

```
AppState {
    currentPage: 'today' | 'timeline' | 'history' | 'stats' | 'apps' | 'settings'
    selectedDate: Date
    ...
}
```

前端通过 `invoke('command_name', args)` 调用 Rust 后端命令，后端返回序列化数据。

### 3.4 托盘管理

```
启动时:
  创建托盘图标 + 右键菜单（显示/退出）

点击托盘图标:
  if 主窗口存在 → 显示并聚焦
  else → 重新创建主窗口

主窗口关闭按钮:
  销毁窗口（不退出进程），Tracker 继续运行

右键菜单"退出":
  停止 Tracker → 关闭数据库 → 退出进程
```

---

## 4. 数据流

```
Windows API
    │
    ▼
Tracker Thread ──写──▶ SQLite
                           │
                    Tauri Command ──读──▶ React UI ──渲染──▶ 屏幕
```

前端通过 Tauri `invoke()` 异步调用 Rust 命令，不阻塞 UI 线程。

---

## 5. 关键技术问题

### 5.1 合并间隔实现

```
session_buffer: Option<PendingSession>

切换应用时:
  if buffer.app == new_app && elapsed < merge_interval:
      buffer.end = None  // 重新激活，不写入结束时间
  else:
      flush buffer → SQLite
      buffer = new PendingSession
```

### 5.2 空闲检测

使用 `GetLastInputInfo()` 获取最后输入时间，超过阈值（如 5min）视为空闲，暂停当前 session（持续记录白名单除外）。

### 5.3 进程路径 → 应用名

首次见到新 exe_path 时：
1. 读取 PE 文件版本信息（`FileDescription` / `ProductName`）
2. 若无版本信息，取文件名去掉扩展名
3. 写入 `apps` 表，用户可后续在应用管理中修改

---

## 6. 目录结构

```
chrona/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # 入口，初始化托盘、启动 Tracker
│   │   ├── tracker/
│   │   │   ├── mod.rs        # Tracker 主循环
│   │   │   ├── windows_api.rs # GetForegroundWindow 等封装
│   │   │   └── merger.rs     # 合并间隔逻辑
│   │   ├── db/
│   │   │   ├── mod.rs        # 连接池、迁移
│   │   │   ├── schema.rs     # 建表 SQL
│   │   │   └── queries.rs    # 各页面查询函数
│   │   └── commands/         # Tauri invoke 命令
│   │       ├── sessions.rs
│   │       ├── apps.rs
│   │       └── settings.rs
│   └── Cargo.toml
├── src/                      # React 前端
│   ├── pages/
│   │   ├── Today.tsx
│   │   ├── Timeline.tsx
│   │   ├── History.tsx
│   │   ├── Stats.tsx
│   │   ├── AppMgmt.tsx
│   │   └── Settings.tsx
│   ├── components/           # 共享组件（图表、日历等）
│   └── main.tsx
├── package.json
└── docs/
    ├── requirements.md
    └── architecture.md
```

---

## 7. 待调研项

- [ ] 原开源项目技术栈（参考: https://www.bilibili.com/video/BV1GoG46AE5o）
- [ ] Windows 进程窗口名获取 API（`QueryFullProcessImageNameW` 权限边界）
- [ ] 浏览器标签页标题获取方案（Accessibility API vs 浏览器扩展）
