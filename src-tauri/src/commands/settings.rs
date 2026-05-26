use tauri::State;
use std::sync::{Arc, Mutex};
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
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let db_lock = db.lock().map_err(|e| e.to_string())?;
    let conn = db_lock.conn();

    if let Some(settings) = data.get("settings").and_then(|s| s.as_object()) {
        for (key, value) in settings {
            if let Some(v) = value.as_str() {
                let _ = queries::save_setting(conn, key, v);
            }
        }
    }

    Ok(())
}
