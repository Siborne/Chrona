use rusqlite::{Connection, params, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppRow {
    pub id: i64,
    pub exe_path: String,
    pub name: String,
    pub category_id: Option<i64>,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryRow {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionRow {
    pub id: i64,
    pub app_id: i64,
    pub title: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub duration: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppUsageStat {
    pub app_id: i64,
    pub app_name: String,
    pub app_color: String,
    pub total_duration: i64,
    pub session_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HourlyStat {
    pub hour: i64,
    pub duration: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendPoint {
    pub date: String,
    pub app_name: String,
    pub duration: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HeatmapPoint {
    pub date: String,
    pub duration: i64,
    pub level: i64,
}

pub fn upsert_app(conn: &Connection, exe_path: &str, name: &str) -> Result<i64> {
    conn.execute(
        "INSERT OR IGNORE INTO apps (exe_path, name) VALUES (?1, ?2)",
        params![exe_path, name],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_or_create_app(conn: &Connection, exe_path: &str, name: &str) -> Result<i64> {
    let result = conn.query_row(
        "SELECT id FROM apps WHERE exe_path = ?1",
        params![exe_path],
        |row| row.get(0),
    );
    match result {
        Ok(id) => Ok(id),
        Err(_) => {
            conn.execute(
                "INSERT INTO apps (exe_path, name) VALUES (?1, ?2)",
                params![exe_path, name],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }
}

pub fn insert_session(conn: &Connection, app_id: i64, title: Option<&str>, started_at: i64, ended_at: Option<i64>, duration: Option<i64>) -> Result<i64> {
    conn.execute(
        "INSERT INTO sessions (app_id, title, started_at, ended_at, duration) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![app_id, title, started_at, ended_at, duration],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_session_end(conn: &Connection, session_id: i64, ended_at: i64, duration: i64) -> Result<()> {
    conn.execute(
        "UPDATE sessions SET ended_at = ?1, duration = ?2 WHERE id = ?3",
        params![ended_at, duration, session_id],
    )?;
    Ok(())
}

pub fn get_active_session(conn: &Connection) -> Result<Option<SessionRow>> {
    let result = conn.query_row(
        "SELECT id, app_id, title, started_at, ended_at, duration FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1",
        [],
        |row| {
            Ok(SessionRow {
                id: row.get(0)?,
                app_id: row.get(1)?,
                title: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                duration: row.get(5)?,
            })
        },
    );
    match result {
        Ok(session) => Ok(Some(session)),
        Err(_) => Ok(None),
    }
}

pub fn get_sessions_by_date(conn: &Connection, date: &str) -> Result<Vec<SessionRow>> {
    let start = format!("{}T00:00:00", date);
    let end = format!("{}T23:59:59", date);

    let mut stmt = conn.prepare(
        "SELECT id, app_id, title, started_at, ended_at, duration
         FROM sessions
         WHERE datetime(started_at / 1000, 'unixepoch', 'localtime') >= ?1
           AND datetime(started_at / 1000, 'unixepoch', 'localtime') <= ?2
         ORDER BY started_at ASC"
    )?;

    let rows = stmt.query_map(params![start, end], |row| {
        Ok(SessionRow {
            id: row.get(0)?,
            app_id: row.get(1)?,
            title: row.get(2)?,
            started_at: row.get(3)?,
            ended_at: row.get(4)?,
            duration: row.get(5)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn get_app_usage_for_date(conn: &Connection, date: &str) -> Result<Vec<AppUsageStat>> {
    let start_ts = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0).unwrap();
            Ok(dt.and_local_timezone(chrono::Local).unwrap().timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + 86400000;

    let mut stmt = conn.prepare(
        "SELECT a.id, a.name, a.color,
                COALESCE(SUM(s.duration), 0) as total_duration,
                COUNT(s.id) as session_count
         FROM apps a
         LEFT JOIN sessions s ON s.app_id = a.id
            AND s.started_at >= ?1 AND s.started_at < ?2
         WHERE COALESCE(SUM(s.duration), 0) > 0
         GROUP BY a.id
         ORDER BY total_duration DESC"
    )?;

    let rows = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok(AppUsageStat {
            app_id: row.get(0)?,
            app_name: row.get(1)?,
            app_color: row.get(2)?,
            total_duration: row.get(3)?,
            session_count: row.get(4)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn get_hourly_distribution(conn: &Connection, date: &str) -> Result<Vec<HourlyStat>> {
    let start_ts = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0).unwrap();
            Ok(dt.and_local_timezone(chrono::Local).unwrap().timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + 86400000;

    let mut stmt = conn.prepare(
        "SELECT CAST((started_at - ?1) / 3600000 AS INTEGER) as hour,
                SUM(duration) as total_duration
         FROM sessions
         WHERE started_at >= ?1 AND started_at < ?2 AND duration IS NOT NULL
         GROUP BY hour
         ORDER BY hour"
    )?;

    let rows = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok(HourlyStat {
            hour: row.get(0)?,
            duration: row.get(1)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn get_trend_data(conn: &Connection, days: i64) -> Result<Vec<TrendPoint>> {
    let now = chrono::Local::now();
    let start = now - chrono::Duration::days(days);
    let start_ts = start.timestamp_millis();
    let end_ts = now.timestamp_millis();

    let mut stmt = conn.prepare(
        "SELECT date(started_at / 1000, 'unixepoch', 'localtime') as day,
                a.name,
                SUM(s.duration) as total_duration
         FROM sessions s
         JOIN apps a ON a.id = s.app_id
         WHERE s.started_at >= ?1 AND s.started_at < ?2 AND s.duration IS NOT NULL
         GROUP BY day, a.name
         ORDER BY day, a.name"
    )?;

    let rows = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok(TrendPoint {
            date: row.get(0)?,
            app_name: row.get(1)?,
            duration: row.get(2)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn get_heatmap_data(conn: &Connection, year: i64) -> Result<Vec<HeatmapPoint>> {
    let start = chrono::NaiveDate::from_ymd_opt(year as i32, 1, 1).unwrap();
    let end = chrono::NaiveDate::from_ymd_opt((year + 1) as i32, 1, 1).unwrap();
    let start_ts = start.and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Local).unwrap().timestamp_millis();
    let end_ts = end.and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Local).unwrap().timestamp_millis();

    let mut stmt = conn.prepare(
        "SELECT date(started_at / 1000, 'unixepoch', 'localtime') as day,
                SUM(duration) as total_duration
         FROM sessions
         WHERE started_at >= ?1 AND started_at < ?2 AND duration IS NOT NULL
         GROUP BY day
         ORDER BY day"
    )?;

    let rows: Vec<(String, i64)> = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?.collect::<Result<Vec<_>>>()?;

    let max_duration = rows.iter().map(|(_, d)| *d).max().unwrap_or(1);

    let result = rows.into_iter().map(|(date, duration)| {
        let level = if duration == 0 { 0 }
        else if duration < max_duration / 4 { 1 }
        else if duration < max_duration / 2 { 2 }
        else if duration < max_duration * 3 / 4 { 3 }
        else { 4 };
        HeatmapPoint { date, duration, level }
    }).collect();

    Ok(result)
}

pub fn get_cumulative_ranking(conn: &Connection) -> Result<Vec<AppUsageStat>> {
    let mut stmt = conn.prepare(
        "SELECT a.id, a.name, a.color,
                COALESCE(SUM(s.duration), 0) as total_duration,
                COUNT(s.id) as session_count
         FROM apps a
         LEFT JOIN sessions s ON s.app_id = a.id AND s.duration IS NOT NULL
         GROUP BY a.id
         ORDER BY total_duration DESC
         LIMIT 20"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(AppUsageStat {
            app_id: row.get(0)?,
            app_name: row.get(1)?,
            app_color: row.get(2)?,
            total_duration: row.get(3)?,
            session_count: row.get(4)?,
        })
    })?.collect::<Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn get_all_apps(conn: &Connection) -> Result<Vec<AppRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, exe_path, name, category_id, color FROM apps ORDER BY name"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(AppRow {
            id: row.get(0)?,
            exe_path: row.get(1)?,
            name: row.get(2)?,
            category_id: row.get(3)?,
            color: row.get(4)?,
        })
    })?.collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn get_all_categories(conn: &Connection) -> Result<Vec<CategoryRow>> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM categories ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(CategoryRow {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    })?.collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn update_app(conn: &Connection, id: i64, name: Option<&str>, category_id: Option<i64>, color: Option<&str>) -> Result<()> {
    if let Some(n) = name {
        conn.execute("UPDATE apps SET name = ?1 WHERE id = ?2", params![n, id])?;
    }
    if let Some(c) = category_id {
        conn.execute("UPDATE apps SET category_id = ?1 WHERE id = ?2", params![c, id])?;
    }
    if let Some(clr) = color {
        conn.execute("UPDATE apps SET color = ?1 WHERE id = ?2", params![clr, id])?;
    }
    Ok(())
}

pub fn delete_app(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM sessions WHERE app_id = ?1", params![id])?;
    conn.execute("DELETE FROM apps WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn create_category(conn: &Connection, name: &str, color: &str) -> Result<i64> {
    conn.execute("INSERT INTO categories (name, color) VALUES (?1, ?2)", params![name, color])?;
    Ok(conn.last_insert_rowid())
}

pub fn delete_category(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("UPDATE apps SET category_id = NULL WHERE category_id = ?1", params![id])?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_all_settings(conn: &Connection) -> Result<std::collections::HashMap<String, String>> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let mut map = std::collections::HashMap::new();
    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let value: String = row.get(1)?;
        Ok((key, value))
    })?;
    for row in rows {
        let (k, v) = row?;
        map.insert(k, v);
    }
    Ok(map)
}

pub fn save_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}
