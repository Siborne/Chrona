import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import type { Session, App } from "../types";

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface Tooltip {
  x: number;
  y: number;
  appName: string;
  title: string | null;
  start: number;
  end: number;
}

export default function Timeline() {
  const { apps, selectedDate, setSelectedDate } = useAppStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    invoke<Session[]>("get_sessions_by_date", { date: dateStr })
      .then(setSessions)
      .catch(console.error);
  }, [dateStr]);

  const appMap = new Map<number, App>(apps.map((a) => [a.id, a]));

  // Group sessions by app
  const appIds = [...new Set(sessions.map((s) => s.app_id))];

  // Day boundaries in ms
  const dayStart = new Date(dateStr + "T00:00:00").getTime();
  const dayEnd = dayStart + 86400000;

  function toPercent(ts: number) {
    return ((ts - dayStart) / 86400000) * 100;
  }

  const hourLabels = Array.from({ length: 25 }, (_, i) => i);

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  }

  return (
    <>
      <div className="page-header">
        <h2>时间线</h2>
        <div className="page-header-actions">
          <button className="btn btn-sm" onClick={() => changeDate(-1)}>‹</button>
          <span style={{ fontSize: 14, minWidth: 100, textAlign: "center" }}>{dateStr}</span>
          <button className="btn btn-sm" onClick={() => changeDate(1)}>›</button>
          <button className="btn btn-sm" onClick={() => setSelectedDate(new Date())}>今天</button>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ overflow: "hidden" }}>
          {sessions.length === 0 ? (
            <div className="empty-state"><p>暂无数据</p></div>
          ) : (
            <div ref={containerRef} style={{ position: "relative" }}>
              {/* Hour axis */}
              <div style={{ display: "flex", marginLeft: 120, marginBottom: 4 }}>
                {hourLabels.map((h) => (
                  <div key={h} style={{ flex: h < 24 ? 1 : 0, fontSize: 11, color: "var(--text-muted)", textAlign: "left" }}>
                    {h % 3 === 0 ? `${h}:00` : ""}
                  </div>
                ))}
              </div>

              {/* App rows */}
              {appIds.map((appId) => {
                const app = appMap.get(appId);
                const appSessions = sessions.filter((s) => s.app_id === appId);
                return (
                  <div key={appId} className="timeline-row">
                    <div className="timeline-label" title={app?.name}>
                      {app?.name ?? "Unknown"}
                    </div>
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
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: app?.color ?? "#888",
                            }}
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

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="tooltip"
                  style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
                >
                  <div style={{ fontWeight: 600 }}>{tooltip.appName}</div>
                  {tooltip.title && (
                    <div style={{ color: "var(--text-secondary)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tooltip.title}
                    </div>
                  )}
                  <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                    {formatTime(tooltip.start)} – {formatTime(tooltip.end)}
                    {" · "}
                    {formatDuration(tooltip.end - tooltip.start)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
