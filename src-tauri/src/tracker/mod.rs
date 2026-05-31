pub mod windows_api;
mod merger;

use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::Duration;
use crate::db::Database;
use crate::db::queries;

pub struct Tracker {
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
}

impl Tracker {
    pub fn new(db: Arc<Mutex<Database>>, merge_interval_secs: u64) -> Self {
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();

        let handle = thread::spawn(move || {
            let mut merger = merger::SessionMerger::new(merge_interval_secs);
            let mut was_idle = false;

            while running_clone.load(Ordering::Relaxed) {
                match windows_api::get_foreground_info() {
                    Some(info) => {
                        let is_excl = {
                            let db_lock = db.lock().unwrap();
                            is_excluded(&db_lock, &info.exe_path)
                        };
                        if is_excl {
                            thread::sleep(Duration::from_secs(1));
                            continue;
                        }

                        let now = chrono::Local::now().timestamp_millis();

                        let is_idle = windows_api::is_idle(300);
                        let is_continuous = {
                            let db_lock = db.lock().unwrap();
                            is_continuous_app(&db_lock, &info.exe_path)
                        };

                        if is_idle && !is_continuous {
                            if let Some(active) = merger.active.take() {
                                let db_lock = db.lock().unwrap();
                                let conn = db_lock.conn();
                                let _ = queries::update_session_end(
                                    conn,
                                    active.session_id,
                                    now,
                                    now - active.started_at,
                                );
                            }
                            was_idle = true;
                            thread::sleep(Duration::from_secs(2));
                            continue;
                        }

                        if was_idle {
                            was_idle = false;
                            let db_lock = db.lock().unwrap();
                            let conn = db_lock.conn();
                            let app_id = queries::get_or_create_app(
                                conn,
                                &info.exe_path,
                                &info.exe_name,
                            )
                            .unwrap_or(0);
                            match queries::insert_session(
                                conn,
                                app_id,
                                info.window_title.as_deref(),
                                now,
                                None,
                                None,
                            ) {
                                Ok(session_id) => {
                                    merger.set_active(merger::ActiveSession {
                                        session_id,
                                        app_id,
                                        started_at: now,
                                        title: info.window_title.clone(),
                                    });
                                    merger.record_switch(app_id, now);
                                }
                                Err(e) => { log::error!("Failed to insert session on idle resume: {}", e); }
                            }
                            continue;
                        }

                        let db_lock = db.lock().unwrap();
                        let conn = db_lock.conn();
                        let app_id = queries::get_or_create_app(
                            conn,
                            &info.exe_path,
                            &info.exe_name,
                        )
                        .unwrap_or(0);

                        if let Some(active) = &merger.active {
                            if active.app_id == app_id && active.title == info.window_title {
                                continue;
                            }
                        }

                        if let Some(existing_session_id) = merger.should_merge(app_id, now) {
                            let started = merger.active.as_ref().unwrap().started_at;
                            let _ = queries::update_session_end(
                                conn,
                                existing_session_id,
                                now,
                                now - started,
                            );
                            merger.record_switch(app_id, now);
                            continue;
                        }

                        if let Some(active) = merger.active.take() {
                            let _ = queries::update_session_end(
                                conn,
                                active.session_id,
                                now,
                                now - active.started_at,
                            );
                        }

                        match queries::insert_session(
                            conn,
                            app_id,
                            info.window_title.as_deref(),
                            now,
                            None,
                            None,
                        ) {
                            Ok(session_id) => {
                                merger.set_active(merger::ActiveSession {
                                    session_id,
                                    app_id,
                                    started_at: now,
                                    title: info.window_title.clone(),
                                });
                                merger.record_switch(app_id, now);
                            }
                            Err(e) => {
                                log::error!("Failed to insert session: {}", e);
                            }
                        }
                    }
                    None => {
                        log::warn!("Could not get foreground window info");
                    }
                }

                thread::sleep(Duration::from_secs(1));
            }

            if let Some(active) = merger.active.take() {
                let db_lock = db.lock().unwrap();
                let now = chrono::Local::now().timestamp_millis();
                let _ = queries::update_session_end(
                    db_lock.conn(),
                    active.session_id,
                    now,
                    now - active.started_at,
                );
            }

            log::info!("Tracker stopped");
        });

        Self {
            running,
            thread_handle: Some(handle),
        }
    }

    pub fn start(&mut self) {
        log::info!("Tracker started");
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

const SYSTEM_PROCESS_BLACKLIST: &[&str] = &[
    "explorer.exe", "msrdc.exe", "searchhost.exe", "searchindexer.exe",
    "runtimebroker.exe", "svchost.exe", "taskhostw.exe", "sihost.exe",
    "shellexperiencehost.exe", "startmenuexperiencehost.exe", "lockapp.exe",
    "textinputhost.exe", "ctfmon.exe", "dwm.exe", "csrss.exe", "winlogon.exe",
    "fontdrvhost.exe", "lsass.exe", "services.exe", "wininit.exe",
];

fn is_excluded(db: &Database, exe_path: &str) -> bool {
    let lower = exe_path.to_lowercase();
    let filename = std::path::Path::new(&lower)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    if SYSTEM_PROCESS_BLACKLIST.contains(&filename) {
        return true;
    }
    let user_excluded = db.get_setting("excluded_processes").unwrap_or_default();
    if !user_excluded.is_empty() {
        let excluded: Vec<&str> = user_excluded.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        return excluded.iter().any(|e| filename.contains(e) || lower.contains(e));
    }
    false
}

fn is_continuous_app(db: &Database, exe_path: &str) -> bool {
    let setting = db.get_setting("continuous_apps").unwrap_or_default();
    let apps: Vec<String> = setting
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let lower = exe_path.to_lowercase();
    let filename = std::path::Path::new(&lower)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    apps.iter()
        .any(|a| filename.contains(&a.to_lowercase()))
}
