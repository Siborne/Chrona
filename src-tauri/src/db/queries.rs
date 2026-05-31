use rusqlite::{Connection, params, Result};
use serde::{Deserialize, Serialize};

const MS_PER_HOUR: i64 = 3_600_000;
const MS_PER_DAY: i64 = 86_400_000;

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

#[allow(dead_code)] // Utility for crash recovery — currently unused
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
    let start_ts = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .ok()
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0)?;
            let tz = dt.and_local_timezone(chrono::Local).single()?;
            Some(tz.timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + MS_PER_DAY;

    let mut stmt = conn.prepare(
        "SELECT id, app_id, title, started_at, ended_at, duration
         FROM sessions
         WHERE started_at >= ?1 AND started_at < ?2
         ORDER BY started_at ASC"
    )?;

    let rows = stmt.query_map(params![start_ts, end_ts], |row| {
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
        .ok()
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0)?;
            let tz = dt.and_local_timezone(chrono::Local).single()?;
            Some(tz.timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + MS_PER_DAY;

    let mut stmt = conn.prepare(
        "SELECT a.id, a.name, a.color,
                COALESCE(SUM(s.duration), 0) as total_duration,
                COUNT(s.id) as session_count
         FROM apps a
         LEFT JOIN sessions s ON s.app_id = a.id
            AND s.started_at >= ?1 AND s.started_at < ?2
         GROUP BY a.id
         HAVING total_duration > 0
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
        .ok()
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0)?;
            let tz = dt.and_local_timezone(chrono::Local).single()?;
            Some(tz.timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + MS_PER_DAY;

    let hourly_sql = format!(
        "SELECT CAST((started_at - ?1) / {} AS INTEGER) as hour,
                SUM(duration) as total_duration
         FROM sessions
         WHERE started_at >= ?1 AND started_at < ?2 AND duration IS NOT NULL
         GROUP BY hour
         ORDER BY hour",
        MS_PER_HOUR
    );
    let mut stmt = conn.prepare(&hourly_sql)?;

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
    let start = chrono::NaiveDate::from_ymd_opt(year as i32, 1, 1).ok_or(rusqlite::Error::InvalidParameterName("Invalid year".into()))?;
    let end = chrono::NaiveDate::from_ymd_opt((year + 1) as i32, 1, 1).ok_or(rusqlite::Error::InvalidParameterName("Invalid year".into()))?;
    let start_ts = start.and_hms_opt(0, 0, 0)
        .and_then(|dt| dt.and_local_timezone(chrono::Local).single())
        .map(|dt| dt.timestamp_millis())
        .ok_or(rusqlite::Error::InvalidParameterName("Invalid start timestamp".into()))?;
    let end_ts = end.and_hms_opt(0, 0, 0)
        .and_then(|dt| dt.and_local_timezone(chrono::Local).single())
        .map(|dt| dt.timestamp_millis())
        .ok_or(rusqlite::Error::InvalidParameterName("Invalid end timestamp".into()))?;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryUsageStat {
    pub category_id: Option<i64>,
    pub category_name: String,
    pub category_color: Option<String>,
    pub total_duration: i64,
}

pub fn get_category_usage_for_date(conn: &Connection, date: &str) -> Result<Vec<CategoryUsageStat>> {
    let start_ts = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .ok()
        .and_then(|d| {
            let dt = d.and_hms_opt(0, 0, 0)?;
            let tz = dt.and_local_timezone(chrono::Local).single()?;
            Some(tz.timestamp_millis())
        })
        .unwrap_or(0);
    let end_ts = start_ts + MS_PER_DAY;

    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.color, COALESCE(SUM(s.duration), 0) as total_duration
         FROM categories c
         JOIN apps a ON a.category_id = c.id
         JOIN sessions s ON s.app_id = a.id
         WHERE s.started_at >= ?1 AND s.started_at < ?2 AND s.duration IS NOT NULL
         GROUP BY c.id
         HAVING total_duration > 0
         UNION ALL
         SELECT NULL, '未分类', NULL, COALESCE(SUM(s.duration), 0)
         FROM apps a
         JOIN sessions s ON s.app_id = a.id
         WHERE a.category_id IS NULL AND s.started_at >= ?1 AND s.started_at < ?2 AND s.duration IS NOT NULL
         HAVING COALESCE(SUM(s.duration), 0) > 0
         ORDER BY total_duration DESC"
    )?;

    let rows = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok(CategoryUsageStat {
            category_id: row.get(0)?,
            category_name: row.get(1)?,
            category_color: row.get(2)?,
            total_duration: row.get(3)?,
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
    match category_id {
        Some(c) => { conn.execute("UPDATE apps SET category_id = ?1 WHERE id = ?2", params![c, id])?; }
        None => { conn.execute("UPDATE apps SET category_id = NULL WHERE id = ?1", params![id])?; }
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

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to open in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        conn.execute_batch(include_str!("schema.sql")).unwrap();
        conn
    }

    #[test]
    fn test_get_or_create_app_creates_new() {
        let conn = setup_db();
        let id = get_or_create_app(&conn, "C:\\test.exe", "TestApp").unwrap();
        assert!(id > 0);
    }

    #[test]
    fn test_get_or_create_app_returns_existing() {
        let conn = setup_db();
        let id1 = get_or_create_app(&conn, "C:\\test.exe", "TestApp").unwrap();
        let id2 = get_or_create_app(&conn, "C:\\test.exe", "DifferentName").unwrap();
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_insert_session_and_query_by_date() {
        let conn = setup_db();
        let app_id = get_or_create_app(&conn, "C:\\test.exe", "TestApp").unwrap();
        let start_ts = 1700000000000_i64;
        insert_session(&conn, app_id, Some("Test Window"), start_ts, Some(start_ts + 60000), Some(60000)).unwrap();
        let date = "2023-11-14";
        let _ = get_sessions_by_date(&conn, date);
    }

    #[test]
    fn test_update_app_sets_category_id_null() {
        let conn = setup_db();
        let id = get_or_create_app(&conn, "C:\\test.exe", "TestApp").unwrap();
        create_category(&conn, "Work", "#ff0000").unwrap();
        update_app(&conn, id, None, Some(1), None).unwrap();
        update_app(&conn, id, None, None, None).unwrap();
        let apps = get_all_apps(&conn).unwrap();
        let app = apps.iter().find(|a| a.id == id).unwrap();
        assert!(app.category_id.is_none());
    }

    #[test]
    fn test_update_app_preserves_name_when_not_specified() {
        let conn = setup_db();
        let id = get_or_create_app(&conn, "C:\\test.exe", "OriginalName").unwrap();
        update_app(&conn, id, None, None, Some("#ff0000")).unwrap();
        let apps = get_all_apps(&conn).unwrap();
        let app = apps.iter().find(|a| a.id == id).unwrap();
        assert_eq!(app.name, "OriginalName");
    }

    #[test]
    fn test_delete_category_clears_app_assignments() {
        let conn = setup_db();
        let app_id = get_or_create_app(&conn, "C:\\test.exe", "TestApp").unwrap();
        let cat_id = create_category(&conn, "Work", "#ff0000").unwrap();
        update_app(&conn, app_id, None, Some(cat_id), None).unwrap();
        delete_category(&conn, cat_id).unwrap();
        let apps = get_all_apps(&conn).unwrap();
        let app = apps.iter().find(|a| a.id == app_id).unwrap();
        assert!(app.category_id.is_none());
    }

    #[test]
    fn test_save_and_get_setting() {
        let conn = setup_db();
        save_setting(&conn, "merge_interval", "30").unwrap();
        let settings = get_all_settings(&conn).unwrap();
        assert_eq!(settings.get("merge_interval").unwrap(), "30");
    }

    #[test]
    fn test_get_cumulative_ranking_empty() {
        let conn = setup_db();
        let ranking = get_cumulative_ranking(&conn).unwrap();
        assert!(ranking.is_empty());
    }

    #[test]
    fn test_constants_used_correctly() {
        assert_eq!(MS_PER_HOUR, 3_600_000);
        assert_eq!(MS_PER_DAY, 86_400_000);
    }
}
