use tauri::State;
use std::sync::{Arc, Mutex};
use crate::db::Database;
use crate::db::queries;

#[tauri::command]
pub fn get_apps(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::AppRow>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_all_apps(db_lock.conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_app(
    id: i64,
    name: Option<String>,
    category_id: Option<i64>,
    color: Option<String>,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::update_app(
        db_lock.conn(),
        id,
        name.as_deref(),
        category_id,
        color.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_app(id: i64, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::delete_app(db_lock.conn(), id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_categories(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::CategoryRow>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_all_categories(db_lock.conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(name: String, color: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<i64, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::create_category(db_lock.conn(), &name, &color).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(id: i64, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::delete_category(db_lock.conn(), id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(id: i64, name: Option<String>, color: Option<String>, db: State<'_, Arc<Mutex<Database>>>) -> Result<(), String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::update_category(db_lock.conn(), id, name.as_deref(), color.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ensure_app_colors(db: State<'_, Arc<Mutex<Database>>>) -> Result<usize, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::assign_missing_app_colors(db_lock.conn()).map_err(|e| e.to_string())
}
