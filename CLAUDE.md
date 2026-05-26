# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (frontend + Tauri hot reload)
npm run tauri dev

# Build release
npm run tauri build

# Frontend only (no Tauri)
npm run dev

# Type check
npx tsc -b --noEmit
```

## Architecture

Tauri v2 app: Rust backend + React/TypeScript frontend.

**Data flow**: Windows API → Tracker thread → SQLite ← Tauri commands ← React pages via `invoke()`

### Rust backend (`src-tauri/src/`)

- `main.rs` — initializes DB, runs migrations, starts Tracker, registers tray, registers all `invoke_handler` commands
- `tracker/mod.rs` — background thread polling `GetForegroundWindow()` every 1s, writes sessions to SQLite
- `tracker/merger.rs` — merge interval logic: if the same app returns within N seconds, extends the existing session instead of creating a new one
- `tracker/windows_api.rs` — Windows API wrappers (`GetForegroundWindow`, `QueryFullProcessImageNameW`, `GetWindowTextW`, `GetLastInputInfo`)
- `db/mod.rs` — SQLite connection, migration runner
- `db/schema.sql` — tables: `apps`, `categories`, `sessions`, `settings`
- `db/queries.rs` — all read queries (used by commands)
- `commands/` — Tauri `#[tauri::command]` handlers grouped by domain: `sessions`, `apps`, `settings`

### Frontend (`src/`)

- `store/index.ts` — Zustand store; holds `currentPage`, `apps`, `categories`, `settings`, `theme`; all `invoke()` calls live here
- `types/index.ts` — shared TypeScript types mirroring Rust structs
- `App.tsx` — sidebar nav + page switcher; loads apps/categories/settings on mount
- `pages/` — one file per page (`Today`, `Timeline`, `History`, `Stats`, `AppMgmt`, `Settings`); each page calls store actions or invokes commands directly

### Key conventions

- All Rust→JS data crosses the boundary as JSON via `invoke()`; types must match between `types/index.ts` and Rust structs
- DB path: `%LOCALAPPDATA%\chrona\chrona.db`
- Settings are stored as key-value strings in the `settings` table; `merge_interval` (seconds) is read at startup
- Theme is applied via `data-theme` attribute on `<html>`
