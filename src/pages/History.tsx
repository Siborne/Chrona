import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import type { AppUsageStats } from "../types";
import { formatDuration } from "../utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";

function Calendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = new Date();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={prevMonth} aria-label="上个月">‹</button>
        <span style={{ fontWeight: 600 }}>{viewYear}年 {MONTHS[viewMonth]}</span>
        <button className="btn btn-sm" onClick={nextMonth} aria-label="下个月">›</button>
      </div>
      <div className="calendar-grid" style={{ marginBottom: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div className="calendar-grid" role="grid">
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} role="gridcell" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selected.toDateString();
          return (
            <div
              key={day}
              className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(date)}
              role="gridcell"
              aria-label={`${viewYear}-${viewMonth + 1}-${day}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function History() {
  const { selectedDate, setSelectedDate } = useAppStore();
  const [stats, setStats] = useState<AppUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<AppUsageStats[]>("get_app_usage_for_date", { date: dateStr })
      .then(setStats)
      .catch(e => { console.error("get_app_usage_for_date failed:", e); setError(e.toString()); })
      .finally(() => setLoading(false));
  }, [dateStr, refreshKey]);

  const total = stats.reduce((s, a) => s + a.total_duration, 0);

  return (
    <>
      <div className="page-header">
        <h2>历史</h2>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{dateStr}</span>
      </div>
      <div className="page-body">
        {loading && <LoadingSpinner />}
        {error && <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />}
        {!loading && !error && (
          <div className="grid-2">
            <div className="card">
              <div className="card-title">选择日期</div>
              <Calendar selected={selectedDate} onSelect={setSelectedDate} />
            </div>
            <div className="card">
              <div className="card-title">
                应用使用 · {formatDuration(total)} 总计
              </div>
              {stats.length === 0 ? (
                <div className="empty-state"><p>当天无记录</p></div>
              ) : (
                <div>
                  {stats.map((s) => (
                    <div key={s.app_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="color-dot" style={{ backgroundColor: s.app_color }} />
                      <span style={{ flex: 1, fontSize: 14 }}>{s.app_name}</span>
                      <span className="duration-text" style={{ fontSize: 14 }}>{formatDuration(s.total_duration)}</span>
                      <div className="progress-bar" style={{ width: 80 }}>
                        <div className="progress-bar-fill" style={{ width: `${total > 0 ? (s.total_duration / total) * 100 : 0}%`, backgroundColor: s.app_color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
