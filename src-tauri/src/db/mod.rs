pub mod queries;

use rusqlite::{Connection, Result, params};
use std::path::Path;
use std::fs;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Self { conn })
    }

    pub fn run_migrations(&mut self) -> Result<()> {
        self.conn.execute_batch(include_str!("schema.sql"))?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Option<String> {
        self.conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .ok()
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    pub fn reset_data(&self) -> Result<()> {
        self.conn.execute_batch(
            "DELETE FROM sessions;
             DELETE FROM apps;
             DELETE FROM categories;
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (1, '开发',   '#6366F1');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (2, '浏览器', '#F59E0B');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (3, '通讯',   '#10B981');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (4, '文档',   '#3B82F6');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (5, '娱乐',   '#EC4899');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (6, '设计',   '#F43F5E');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (7, '终端',   '#64748B');
             INSERT OR IGNORE INTO categories (id, name, color) VALUES (8, '其他',   '#9CA3AF');"
        )?;
        Ok(())
    }
}
