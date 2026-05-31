#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod commands;
mod tracker;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

fn main() {
    env_logger::init();

    let db_path = get_data_dir().join("chrona.db");
    let db = db::Database::new(&db_path).expect("Failed to open database");

    let db = Arc::new(Mutex::new(db));

    let tracker_db = Arc::clone(&db);
    let tracker_handle = Arc::new(Mutex::new(None));

    let tracker_handle_clone = Arc::clone(&tracker_handle);
    let merger_interval = {
        let db_lock = db.lock().unwrap();
        db_lock.get_setting("merge_interval")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(30)
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Arc::clone(&db))
        .setup(move |app| {
            let handle = app.handle().clone();

            let mut db_lock = db.lock().unwrap();
            db_lock.run_migrations().expect("Failed to run migrations");
            drop(db_lock);

            let mut tracker = tracker::Tracker::new(Arc::clone(&tracker_db), merger_interval);
            tracker.start();
            *tracker_handle_clone.lock().unwrap() = Some(tracker);

            let main_window = handle.get_webview_window("main").unwrap();
            main_window.show().unwrap();

            // Close button hides to tray instead of quitting
            let win_clone = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_clone.hide();
                }
            });

            let main_window_tray = main_window.clone();
            let tray = app.tray_by_id("main-tray").unwrap();

            let show_item = MenuItemBuilder::with_id("show", "显示 Chrona")
                .build(app)
                .expect("Failed to build show menu item");
            let separator = tauri::menu::PredefinedMenuItem::separator(app)
                .expect("Failed to build separator");
            let quit_item = MenuItemBuilder::with_id("quit", "退出")
                .build(app)
                .expect("Failed to build quit menu item");
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &separator, &quit_item])
                .build()
                .expect("Failed to build tray menu");
            tray.set_menu(Some(menu))
                .expect("Failed to set tray menu");

            tray.on_tray_icon_event(move |_tray_icon, event| {
                if let tauri::tray::TrayIconEvent::Click { .. } = event {
                    let _ = main_window_tray.show();
                    let _ = main_window_tray.set_focus();
                }
            });

            let tracker_for_menu = Arc::clone(&tracker_handle_clone);
            tray.on_menu_event(move |app, event| {
                match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        if let Ok(mut guard) = tracker_for_menu.lock() {
                            if let Some(ref mut t) = *guard {
                                t.stop();
                            }
                        }
                        app.exit(0);
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sessions::get_sessions_by_date,
            commands::sessions::get_app_usage_for_date,
            commands::sessions::get_hourly_distribution,
            commands::sessions::get_trend_data,
            commands::sessions::get_heatmap_data,
            commands::sessions::get_cumulative_ranking,
            commands::sessions::get_category_usage_for_date,
            commands::apps::get_apps,
            commands::apps::update_app,
            commands::apps::delete_app,
            commands::apps::get_categories,
            commands::apps::create_category,
            commands::apps::delete_category,
            commands::apps::update_category,
            commands::apps::ensure_app_colors,
            commands::settings::get_all_settings,
            commands::settings::save_setting,
            commands::settings::export_data,
            commands::settings::import_data,
            commands::settings::set_auto_start,
            commands::settings::get_auto_start,
            commands::settings::reset_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_data_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("chrona")
}
