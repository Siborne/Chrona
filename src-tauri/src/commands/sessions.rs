use tauri::State;
use std::sync::{Arc, Mutex};
use crate::db::Database;
use crate::db::queries;

#[tauri::command]
pub fn get_sessions_by_date(date: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::SessionRow>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_sessions_by_date(db_lock.conn(), &date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_usage_for_date(date: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::AppUsageStat>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_app_usage_for_date(db_lock.conn(), &date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_hourly_distribution(date: String, db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::HourlyStat>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_hourly_distribution(db_lock.conn(), &date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_trend_data(days: i64, db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::TrendPoint>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_trend_data(db_lock.conn(), days).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_heatmap_data(year: i64, db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::HeatmapPoint>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_heatmap_data(db_lock.conn(), year).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cumulative_ranking(db: State<'_, Arc<Mutex<Database>>>) -> Result<Vec<queries::AppUsageStat>, String> {
    let db_lock = db.lock().map_err(|e| e.to_string())?;
    queries::get_cumulative_ranking(db_lock.conn()).map_err(|e| e.to_string())
}
