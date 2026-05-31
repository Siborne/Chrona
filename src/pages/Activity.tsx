import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import type { Session, App, AppUsageStats } from "../types";
import { formatDuration, formatDurationPrecise, MS_PER_DAY } from "../utils";
import Calendar from "../components/Calendar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Tooltip {
  x: number;
  y: number;
  appName: string;
  title: string | null;
  start: number;
  end: number;
}

export default function Activity() {
  const { apps, selectedDate, setSelectedDate } = useAppStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<AppUsageStats[]>([]);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = formatDate(selectedDate);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      invoke<Session[]>("get_sessions_by_date", { date: dateStr }),
      invoke<AppUsageStats[]>("get_app_usage_for_date", { date: dateStr }),
    ])
      .then(([sess, appStats]) => { setSessions(sess); setStats(appStats); })
      .catch((e) => setError(e.toString()))
      .finally(() => setLoading(false));
  }, [dateStr]);

  const appMap = new Map<number, App>(apps.map((a) => [a.id, a]));
  const appIds = [...new Set(sessions.map((s) => s.app_id))];
  const dayStart = new Date(dateStr + "T00:00:00").getTime();
  const dayEnd = dayStart + MS_PER_DAY;
  const total = stats.reduce((s, a) => s + a.total_duration, 0);

  function toPercent(ts: number) {
    return ((ts - dayStart) / MS_PER_DAY) * 100;
  }

  return (
    <>
      <div className="page-header">
        <h2>活动</h2>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{dateStr}</span>
      </div>
      <div className="page-body">
        {loading && <LoadingSpinner />}
        {error && <ErrorBanner message={error} />}
        {!loading && !error && (
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left: Calendar */}
            <div className="card" style={{ width: 280, flexShrink: 0, alignSelf: "flex-start" }}>
              <Calendar selected={selectedDate} onSelect={setSelectedDate} />
            </div>

            {/* Right: Timeline + App list */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Gantt Timeline */}
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="card-title">时间线</div>
                {sessions.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}><p>暂无数据</p></div>
                ) : (
                  <div ref={containerRef} style={{ position: "relative" }}>
                    <div style={{ display: "flex", marginLeft: 120, marginBottom: 4 }}>
                      {Array.from({ length: 25 }, (_, i) => i).map((h) => (
                        <div key={h} style={{ flex: h < 24 ? 1 : 0, fontSize: 11, color: "var(--text-muted)", textAlign: "left" }}>
                          {h % 3 === 0 ? `${h}:00` : ""}
                        </div>
                      ))}
                    </div>
                    {appIds.map((appId) => {
                      const app = appMap.get(appId);
                      const appSessions = sessions.filter((s) => s.app_id === appId);
                      return (
                        <div key={appId} className="timeline-row">
                          <div className="timeline-label" title={app?.name}>{app?.name ?? "Unknown"}</div>
                          <div className="timeline-track">
                            {appSessions.map((s) => {
                              const start = Math.max(s.started_at, dayStart);
                              const end = Math.min(s.ended_at ?? Date.now(), dayEnd);
                              if (end <= start) return null;
                              const left = toPercent(start);
                              const width = Math.max(toPercent(end) - left, 0.2);
                              return (
                                <div
                                  key={s.id}
                                  className="timeline-block"
                                  style={{ left: `${left}%`, width: `${width}%`, backgroundColor: app?.color ?? "#888" }}
                                  onMouseEnter={(e) => {
                                    const rect = containerRef.current?.getBoundingClientRect();
                                    setTooltip({
                                      x: e.clientX - (rect?.left ?? 0),
                                      y: e.clientY - (rect?.top ?? 0),
                                      appName: app?.name ?? "Unknown",
                                      title: s.title,
                                      start: s.started_at,
                                      end: s.ended_at ?? Date.now(),
                                    });
                                  }}
                                  onMouseLeave={() => setTooltip(null)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {tooltip && (
                      <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
                        <div style={{ fontWeight: 600 }}>{tooltip.appName}</div>
                        {tooltip.title && (
                          <div style={{ color: "var(--text-secondary)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {tooltip.title}
                          </div>
                        )}
                        <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                          {formatTime(tooltip.start)} – {formatTime(tooltip.end)}
                          {" · "}
                          {formatDurationPrecise(tooltip.end - tooltip.start)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* App usage list */}
              <div className="card">
                <div className="card-title">当日应用使用 · {formatDuration(total)} 总计</div>
                {stats.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}><p>当天无记录</p></div>
                ) : (
                  <div>
                    {stats.map((s) => (
                      <div key={s.app_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span className="color-dot" style={{ backgroundColor: s.app_color }} />
                        <span style={{ flex: 1, fontSize: 13 }}>{s.app_name}</span>
                        <span className="duration-text" style={{ fontSize: 13 }}>{formatDuration(s.total_duration)}</span>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${total > 0 ? (s.total_duration / total) * 100 : 0}%`, backgroundColor: s.app_color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
