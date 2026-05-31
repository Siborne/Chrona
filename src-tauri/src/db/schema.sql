CREATE TABLE IF NOT EXISTS apps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    exe_path   TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    category_id INTEGER,
    color      TEXT DEFAULT '#888888'
);

CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    color TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id     INTEGER NOT NULL REFERENCES apps(id),
    title      TEXT,
    started_at INTEGER NOT NULL,
    ended_at   INTEGER,
    duration   INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_app_id ON sessions(app_id);

-- Default categories (INSERT OR IGNORE ensures idempotent)
INSERT OR IGNORE INTO categories (id, name, color) VALUES (1, '开发',   '#6366F1');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (2, '浏览器', '#F59E0B');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (3, '通讯',   '#10B981');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (4, '文档',   '#3B82F6');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (5, '娱乐',   '#EC4899');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (6, '设计',   '#F43F5E');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (7, '终端',   '#64748B');
INSERT OR IGNORE INTO categories (id, name, color) VALUES (8, '其他',   '#9CA3AF');
