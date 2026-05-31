use tauri::State;
use std::sync::{Arc, Mutex};
use winreg::enums::*;
use winreg::RegKey;
use crate::db::Database;
use crate::db::queries;

#[tauri::command]
pub fn get_all_settings(db: State<'_, Arc<Mutex<Database>>>) -> Result<std::collections::HashMap<String, String>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_all_settings(db_lock.conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_setting(key: String, value: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::save_setting(db_lock.conn(), &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_data(path: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    let conn = db_lock.conn();

    let apps = queries::get_all_apps(conn).map_err(|e| e.to_string())?;
    let categories = queries::get_all_categories(conn).map_err(|e| e.to_string())?;
    let settings = queries::get_all_settings(conn).map_err(|e| e.to_string())?;

    let export = serde_json::json!({
        "apps": apps,
        "categories": categories,
        "settings": settings,
    });

    std::fs::write(&path, serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_data(path: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let data: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;

    let db_lock = db.lock().map_err(|e| e.to_string())?;
    let conn = db_lock.conn();

    // Begin transaction for atomicity
    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;

    // Import apps (skip duplicates by exe_path)
    if let Some(apps) = data.get("apps").and_then(|a| a.as_array()) {
        let mut stmt = conn.prepare("SELECT exe_path FROM apps").map_err(|e| e.to_string())?;
        let existing: std::collections::HashSet<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for app in apps {
            let exe_path = app.get("exe_path").and_then(|v| v.as_str()).unwrap_or("");
            if exe_path.is_empty() || existing.contains(exe_path) {
                continue;
            }
            let name = app.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown");
            let color = app.get("color").and_then(|v| v.as_str()).unwrap_or("#888888");
            let category_id: Option<i64> = app.get("category_id").and_then(|v| v.as_i64());

            let _ = conn.execute(
                "INSERT INTO apps (exe_path, name, category_id, color) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![exe_path, name, category_id, color],
            );
        }
    }

    // Import categories (skip duplicates by name)
    if let Some(categories) = data.get("categories").and_then(|c| c.as_array()) {
        let mut stmt = conn.prepare("SELECT name FROM categories").map_err(|e| e.to_string())?;
        let existing: std::collections::HashSet<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for cat in categories {
            let name = cat.get("name").and_then(|v| v.as_str()).unwrap_or("");
            if name.is_empty() || existing.contains(name) {
                continue;
            }
            let color = cat.get("color").and_then(|v| v.as_str()).unwrap_or("#888888");
            let _ = queries::create_category(conn, name, color);
        }
    }

    // Import settings (upsert)
    if let Some(settings) = data.get("settings").and_then(|s| s.as_object()) {
        for (key, value) in settings {
            if let Some(v) = value.as_str() {
                let _ = queries::save_setting(conn, key, v);
            }
        }
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_auto_start(enabled: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;
    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        key.set_value("Chrona", &exe.to_string_lossy().to_string())
            .map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value("Chrona");
    }
    Ok(())
}

#[tauri::command]
pub fn get_auto_start() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let key = hkcu
        .open_subkey_with_flags(path, KEY_READ)
        .map_err(|e| e.to_string())?;
    match key.get_value::<String, _>("Chrona") {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn reset_data(db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    db_lock.reset_data().map_err(|e| e.to_string())
}
