# Chrona 页面结构重组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge 7 pages into 4 to eliminate feature overlap and clarify navigation.

**Architecture:** Pure frontend refactor — no Rust/backend changes. Extract shared Calendar component, rewrite Overview to support tab-based time ranges, create Activity page combining Timeline + History, restructure Stats layout, merge AppMgmt into Settings. Delete 4 obsolete page files.

**Tech Stack:** React 18, TypeScript, Zustand, Recharts, Tauri v2 invoke

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | PageId: 7 → 4 values |
| `src/App.tsx` | Modify | NAV_ITEMS, PAGE_COMPONENTS, imports |
| `src/components/Calendar.tsx` | **Create** | Shared calendar extracted from History |
| `src/pages/Overview.tsx` | **Rewrite** | Tab-based dashboard (Today + Overview) |
| `src/pages/Activity.tsx` | **Create** | Calendar + Timeline + App list |
| `src/pages/Stats.tsx` | Modify | Reorder: heatmap first |
| `src/pages/Settings.tsx` | Modify | Absorb AppMgmt components |
| `src/pages/Today.tsx` | **Delete** | Merged into Overview |
| `src/pages/Timeline.tsx` | **Delete** | Merged into Activity |
| `src/pages/History.tsx` | **Delete** | Merged into Activity |
| `src/pages/AppMgmt.tsx` | **Delete** | Merged into Settings |

---

### Task 1: Update types and navigation wiring

**Files:**
- Modify: `src/types/index.ts:79`
- Modify: `src/App.tsx:1-43`

- [ ] **Step 1: Update PageId type**

In `src/types/index.ts`, change line 79:

```typescript
// BEFORE
export type PageId = "today" | "timeline" | "history" | "stats" | "apps" | "settings";

// AFTER
export type PageId = "overview" | "activity" | "stats" | "settings";
```

- [ ] **Step 2: Update App.tsx imports and navigation**

Replace the imports and NAV_ITEMS/PAGE_COMPONENTS in `src/App.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import {
  BarChart3,
  Clock,
  CalendarDays,
  TrendingUp,
  Settings,
  Download,
} from "lucide-react";
import type { PageId } from "./types";
import html2canvas from "html2canvas";
import { applyTimeTheme, getTimeTheme, formatTimeHM } from "./theme";
import { COLOR_PRESETS, applyColorTheme, accentToGradient } from "./colorThemes";

import Overview from "./pages/Overview";
import Activity from "./pages/Activity";
import Stats from "./pages/Stats";
import SettingsPage from "./pages/Settings";

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Clock }[] = [
  { id: "overview", label: "总览", icon: BarChart3 },
  { id: "activity", label: "活动", icon: CalendarDays },
  { id: "stats", label: "统计", icon: TrendingUp },
  { id: "settings", label: "设置", icon: Settings },
];

const PAGE_COMPONENTS: Record<PageId, React.FC> = {
  overview: Overview,
  activity: Activity,
  stats: Stats,
  settings: SettingsPage,
};
```

Keep everything else in App.tsx unchanged (Greeting, exportScreenshot, useEffect hooks, sidebar JSX).

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Errors about missing `Activity` page (not created yet) and deleted pages still referenced. This is expected — we'll fix in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/App.tsx
git commit -m "refactor: update PageId and navigation for 4-page structure"
```

---

### Task 2: Extract shared Calendar component

**Files:**
- Create: `src/components/Calendar.tsx`

- [ ] **Step 1: Create Calendar component**

Extract the Calendar from `src/pages/History.tsx` (lines 9-63) into `src/components/Calendar.tsx`. Add a `dataDates` prop for showing activity dots.

```typescript
import { useState } from "react";

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendar({
  selected,
  onSelect,
  dataDates,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  dataDates?: Set<string>;
}) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = new Date();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
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
          const dateStr = formatDate(date);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selected.toDateString();
          const hasData = dataDates?.has(dateStr) ?? false;
          return (
            <div
              key={day}
              className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${hasData ? "has-data" : ""}`}
              onClick={() => onSelect(date)}
              role="gridcell"
              aria-label={`${viewYear}-${viewMonth + 1}-${day}`}
              style={{ position: "relative" }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Still errors from missing Activity page and stale imports. Calendar itself should have no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Calendar.tsx
git commit -m "feat: extract shared Calendar component from History"
```

---

### Task 3: Create Activity page

**Files:**
- Create: `src/pages/Activity.tsx`

- [ ] **Step 1: Create Activity.tsx**

Combine Timeline's Gantt chart and History's app usage list with the shared Calendar. Key: both sections share `selectedDate` from the store.

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Errors only from stale Overview.tsx (still has old exports) and deleted page references in App.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Activity.tsx
git commit -m "feat: create Activity page (Timeline + History merged)"
```

---

### Task 4: Rewrite Overview page

**Files:**
- Rewrite: `src/pages/Overview.tsx`

- [ ] **Step 1: Rewrite Overview.tsx with tab switching**

This is the largest change. The new Overview merges Today and the old Overview into a single tabbed page. Copy the internal components from Today.tsx (HourlyChart, CategoryBars, TopAppsList, RecentSessions) and Overview.tsx (DailyBarChart, AppTrendChart, WeeklySummary) into the new file.

Read the current `src/pages/Today.tsx` and `src/pages/Overview.tsx` fully, then write the new `src/pages/Overview.tsx`:

```typescript
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { TrendingUp, Calendar, BarChart3, Trophy, Clock, List } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, BarChart, Bar } from "recharts";
import { formatDuration, MS_PER_HOUR } from "../utils";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";
import type { Session, TrendData, HeatmapData, AppUsageStats } from "../types";

// ── Types ─────────────────────────────────────────────────
interface CategoryUsageStat {
  category_id: number | null;
  category_name: string;
  category_color: string | null;
  total_duration: number;
}

type TabId = "today" | "7" | "14" | "30";

// ── Helpers ───────────────────────────────────────────────
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ── Sub-components (from Today) ───────────────────────────
function HourlyChart({ date }: { date: string }) {
  const [data, setData] = useState<{ hour: number; duration: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    invoke<{ hour: number; duration: number }[]>("get_hourly_distribution", { date })
      .then(setData)
      .catch((e) => setError(e.toString()))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (data.length === 0) return <div className="empty-state" style={{ height: 180 }}><p>暂无数据</p></div>;

  const maxDuration = Math.max(...data.map((d) => d.duration), 1);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20, width: 36, flexShrink: 0 }}>
        {[maxDuration, maxDuration * 0.5, 0].map((v, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>{formatDuration(v)}</span>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", height: 160, gap: 2 }}>
          {Array.from({ length: 24 }, (_, i) => {
            const hourData = data.find((d) => d.hour === i);
            const height = hourData ? (hourData.duration / maxDuration) * 100 : 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{
                  height: `${Math.max(height, height > 0 ? 2 : 0)}%`,
                  backgroundColor: "var(--accent)", borderRadius: "2px 2px 0 0",
                  opacity: height > 0 ? 0.85 : 0.15, minHeight: height > 0 ? 2 : 0,
                }} title={`${i}:00 — ${formatDuration(hourData?.duration || 0)}`} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", borderTop: "1px solid var(--border)", paddingTop: 4 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--text-muted)" }}>{i % 6 === 0 ? `${i}` : ""}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryBars({ data }: { data: CategoryUsageStat[] }) {
  const total = data.reduce((s, a) => s + a.total_duration, 0);
  if (data.length === 0) return <div className="empty-state" style={{ height: 180 }}><p>暂无分类数据</p></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((cat) => (
        <div key={cat.category_id ?? "none"}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="color-dot" style={{ backgroundColor: cat.category_color ?? "#94a3b8" }} />
              <span>{cat.category_name}</span>
            </div>
            <span style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{formatDuration(cat.total_duration)}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (cat.total_duration / total) * 100 : 0}%`, backgroundColor: cat.category_color ?? "#94a3b8" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopAppsList({ stats, total }: { stats: AppUsageStats[]; total: number }) {
  const top = stats.slice(0, 8);
  if (top.length === 0) return <div className="empty-state" style={{ height: 180 }}><p>暂无数据</p></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {top.map((app, i) => (
        <div key={app.app_id}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", width: 16, textAlign: "right" }}>{i + 1}</span>
              <span className="color-dot" style={{ backgroundColor: app.app_color }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{app.app_name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{app.session_count}次</span>
              <span className="duration-text" style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatDuration(app.total_duration)}</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (app.total_duration / total) * 100 : 0}%`, backgroundColor: app.app_color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentSessions({ sessions, apps }: { sessions: Session[]; apps: { id: number; name: string; color: string }[] }) {
  const recent = sessions.slice(-10).reverse();
  if (recent.length === 0) return <div className="empty-state"><List /><p>暂无会话记录</p></div>;
  const appMap = new Map(apps.map((a) => [a.id, a]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {recent.map((s, i) => {
        const app = appMap.get(s.app_id);
        const dur = s.duration ?? (s.ended_at ? s.ended_at - s.started_at : Date.now() - s.started_at);
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span className="color-dot" style={{ backgroundColor: app?.color ?? "#888" }} />
            <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {app?.name ?? "Unknown"}
              {s.title && <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 12 }}>— {s.title}</span>}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{formatTime(s.started_at)}</span>
            <span className="duration-text" style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 50, textAlign: "right" }}>{formatDuration(dur)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-components (from old Overview) ────────────────────
function DailyBarChart({ days }: { days: number }) {
  const [data, setData] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoke<TrendData[]>("get_trend_data", { days })
      .then((trend) => {
        const dateMap = new Map<string, number>();
        for (const t of trend) dateMap.set(t.date, (dateMap.get(t.date) ?? 0) + t.duration);
        setData([...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date: date.slice(5), total: Math.round(total / 60000) })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSpinner />;
  if (data.length === 0) return <div className="empty-state"><p>暂无数据</p></div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
        <ReTooltip formatter={(v: number) => `${v}分钟`} />
        <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AppTrendChart({ days }: { days: number }) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoke<TrendData[]>("get_trend_data", { days }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSpinner />;
  if (data.length === 0) return <div className="empty-state"><p>暂无数据</p></div>;

  const dates = [...new Set(data.map((d) => d.date))].sort();
  const appNames = [...new Set(data.map((d) => d.app_name))].slice(0, 6);
  const COLORS = ["#B4A0FF", "#E8A0FF", "#A0C0FF", "#FFB6C1", "#C8A0E0", "#D8B0FF"];

  const pivoted = dates.map((date) => {
    const row: Record<string, string | number> = { date: date.slice(5) };
    for (const app of appNames) {
      const point = data.find((d) => d.date === date && d.app_name === app);
      row[app] = point ? Math.round(point.duration / 60000) : 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={pivoted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
        <ReTooltip formatter={(v: number) => `${v}分钟`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {appNames.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function WeeklySummary({ days }: { days: number }) {
  const [data, setData] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoke<TrendData[]>("get_trend_data", { days })
      .then((trend) => {
        const dateMap = new Map<string, number>();
        for (const t of trend) dateMap.set(t.date, (dateMap.get(t.date) ?? 0) + t.duration);
        setData([...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSpinner />;

  const totalMs = data.reduce((s, d) => s + d.total, 0);
  const avgMs = data.length > 0 ? totalMs / data.length : 0;
  const maxDay = data.reduce((max, d) => d.total > max.total ? d : max, { date: "", total: 0 });

  return (
    <div className="grid-3">
      <div className="card">
        <div className="stat-value">{formatDuration(totalMs)}</div>
        <div className="stat-label">累计使用 · {days} 天</div>
      </div>
      <div className="card">
        <div className="stat-value">{formatDuration(avgMs)}</div>
        <div className="stat-label">日均使用</div>
      </div>
      <div className="card">
        <div className="stat-value">{maxDay.date ? maxDay.date.slice(5) : "—"}</div>
        <div className="stat-label">最活跃 · {maxDay.date ? formatDuration(maxDay.total) : ""}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function Overview() {
  const { apps } = useAppStore();
  const [tab, setTab] = useState<TabId>("today");
  const [viewDate, setViewDate] = useState(new Date());
  const [multiDays, setMultiDays] = useState(7);
  const [stats, setStats] = useState<AppUsageStats[]>([]);
  const [catStats, setCatStats] = useState<CategoryUsageStat[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = formatDate(viewDate);
  const isToday = dateStr === formatDate(new Date());
  const totalTime = stats.reduce((s, a) => s + a.total_duration, 0);

  // Fetch "today" data when tab is "today" or date changes
  useEffect(() => {
    if (tab !== "today") return;
    setLoading(true);
    setError(null);
    Promise.all([
      invoke<AppUsageStats[]>("get_app_usage_for_date", { date: dateStr }),
      invoke<CategoryUsageStat[]>("get_category_usage_for_date", { date: dateStr }),
      invoke<Session[]>("get_sessions_by_date", { date: dateStr }),
    ])
      .then(([appData, catData, sessData]) => { setStats(appData); setCatStats(catData); setSessions(sessData); })
      .catch((e) => setError(e.toString()))
      .finally(() => setLoading(false));
  }, [tab, dateStr]);

  // Reset date when switching to "today" tab
  useEffect(() => {
    if (tab === "today") setViewDate(new Date());
  }, [tab]);

  function changeDate(delta: number) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    setViewDate(d);
  }

  const appPieData = stats.map((s) => ({ name: s.app_name, value: s.total_duration, color: s.app_color }));

  const TABS: { id: TabId; label: string }[] = [
    { id: "today", label: "今天" },
    { id: "7", label: "7天" },
    { id: "14", label: "14天" },
    { id: "30", label: "30天" },
  ];

  return (
    <>
      <div className="page-header">
        <h2>总览</h2>
        <div className="page-header-actions">
          {tab === "today" && (
            <>
              <button className="btn btn-sm" onClick={() => changeDate(-1)}>‹</button>
              <span style={{ fontSize: 14, minWidth: 100, textAlign: "center" }}>{isToday ? `今天 · ${dateStr}` : dateStr}</span>
              <button className="btn btn-sm" onClick={() => changeDate(1)}>›</button>
              {!isToday && <button className="btn btn-sm" onClick={() => setViewDate(new Date())}>今天</button>}
            </>
          )}
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`btn btn-sm ${tab === t.id ? "btn-primary" : ""}`}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "today") setMultiDays(Number(t.id));
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="page-body">
        {tab === "today" ? (
          <>
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} />}
            {!loading && !error && (
              <>
                <div className="grid-3" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div className="stat-value">{formatDuration(totalTime)}</div>
                    <div className="stat-label">总使用时长</div>
                  </div>
                  <div className="card">
                    <div className="stat-value">{stats.length}</div>
                    <div className="stat-label">活跃应用数</div>
                  </div>
                  <div className="card">
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">记录会话数</div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div className="card-title">应用占比</div>
                    {appPieData.length === 0 ? (
                      <div className="empty-state"><Clock /><p>暂无使用记录</p></div>
                    ) : (
                      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ width: 140, flexShrink: 0 }}>
                          <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                              <Pie data={appPieData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={60}>
                                {appPieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                              </Pie>
                              <ReTooltip formatter={(v: number) => formatDuration(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: 180 }}>
                          {appPieData.slice(0, 6).map((d) => (
                            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                              <span className="color-dot" style={{ backgroundColor: d.color }} />
                              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                              <span className="duration-text" style={{ fontSize: 12 }}>{formatDuration(d.value)}</span>
                              <span style={{ fontSize: 11, color: "var(--text-muted)", width: 36, textAlign: "right" }}>{totalTime > 0 ? `${Math.round((d.value / totalTime) * 100)}%` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card">
                    <div className="card-title">分类分布</div>
                    <CategoryBars data={catStats} />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="card">
                    <div className="card-title">24小时分布</div>
                    <HourlyChart date={dateStr} />
                  </div>
                  <div className="card">
                    <div className="card-title">应用排行</div>
                    <TopAppsList stats={stats} total={totalTime} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">最近会话</div>
                  <RecentSessions sessions={sessions} apps={apps} />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <WeeklySummary days={multiDays} />
            <div className="grid-2" style={{ marginTop: 16, marginBottom: 16 }}>
              <div className="card">
                <div className="card-title">每日使用量</div>
                <DailyBarChart days={multiDays} />
              </div>
              <div className="card">
                <div className="card-title">应用使用趋势</div>
                <AppTrendChart days={multiDays} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Errors from stale App.tsx imports (Today, Timeline, History, AppMgmt still imported).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Overview.tsx
git commit -m "feat: rewrite Overview with tab-based time range switching"
```

---

### Task 5: Restructure Stats page

**Files:**
- Modify: `src/pages/Stats.tsx`

- [ ] **Step 1: Reorder Stats sections**

In `src/pages/Stats.tsx`, swap the order of the three card sections in the JSX. The current order is: 1) TrendChart, 2) Heatmap, 3) Ranking. Change to: 1) Heatmap, 2) TrendChart, 3) Ranking.

In the return JSX (around line 144-199), reorder the cards so the Heatmap card comes first:

```typescript
      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-title">年度活跃热力图 · {new Date().getFullYear()}</div>
          <Heatmap />
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>使用趋势</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[7, 30, 365].map((d) => (
                <button key={d} className={`btn btn-sm ${days === d ? "btn-primary" : ""}`} onClick={() => setDays(d)} aria-label={d === 365 ? "近一年" : `近${d}天`}>
                  {d === 365 ? "近一年" : `近${d}天`}
                </button>
              ))}
            </div>
          </div>
          <TrendChart days={days} />
        </div>

        <div className="card">
          <div className="card-title">累计使用排行</div>
          {/* ... ranking table unchanged ... */}
        </div>
      </div>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Stats.tsx
git commit -m "refactor: reorder Stats page with heatmap first"
```

---

### Task 6: Merge AppMgmt into Settings

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add AppMgmt imports to Settings.tsx**

Add to the imports at the top of `src/pages/Settings.tsx`:

```typescript
import { Trash2, Pencil, Plus } from "lucide-react";
```

(Lucide icons `X` is already imported; add `Trash2`, `Pencil`, `Plus` if not present.)

- [ ] **Step 2: Add AppMgmt state and handlers**

Add inside the SettingsPage function, after the existing state declarations:

```typescript
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#B4A0FF");
  const [appSearch, setAppSearch] = useState("");
```

Add these imports at the top:

```typescript
import type { App, Category } from "../types";
```

Add handlers inside the function body:

```typescript
  const filteredApps = apps.filter((a) => a.name.toLowerCase().includes(appSearch.toLowerCase()));

  async function handleSaveApp(id: number, name: string, color: string, categoryId: number | null) {
    await invoke("update_app", { id, name, color, category_id: categoryId });
    loadApps();
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    await invoke("create_category", { name: newCatName.trim(), color: newCatColor });
    setNewCatName("");
    loadCategories();
  }

  async function handleDeleteApp(id: number) {
    await invoke("delete_app", { id });
    loadApps();
  }

  async function handleDeleteCategory(id: number) {
    await invoke("delete_category", { id });
    loadCategories();
  }
```

Note: `loadApps` and `loadCategories` need to be destructured from the store. Update the store destructuring:

```typescript
  const { settings, saveSetting, setTheme, theme, apps, categories, loadApps, loadCategories } = useAppStore();
```

- [ ] **Step 3: Add AppMgmt JSX between "外观" and "系统" cards**

Insert this block after the color theme card and before the "系统" card:

```typescript
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>应用管理 ({apps.length})</div>
            <input className="input" style={{ width: 200 }} placeholder="搜索应用..." value={appSearch} onChange={(e) => setAppSearch(e.target.value)} aria-label="搜索应用" />
          </div>
          {filteredApps.length === 0 ? (
            <div className="empty-state"><p>暂无应用记录</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>应用</th>
                  <th>分类</th>
                  <th>路径</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => {
                  const cat = categories.find((c) => c.id === app.category_id);
                  return (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="color-dot" style={{ backgroundColor: app.color }} />
                          {app.name}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{cat?.name ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.exe_path}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-sm" onClick={() => setEditingApp(app)} title="编辑"><Pencil size={14} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteApp(app.id)} title="删除"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-title">分类管理</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input className="input" placeholder="新分类名称" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()} />
            <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} style={{ width: 40, height: 38, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer", padding: 2 }} />
            <button className="btn btn-primary" onClick={handleCreateCategory}><Plus size={16} />添加</button>
          </div>
          {categories.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>暂无分类</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)", fontSize: 13 }}>
                  <span className="color-dot" style={{ backgroundColor: c.color ?? "#888" }} />
                  {c.name}
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1 }} onClick={() => handleDeleteCategory(c.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
```

Also add the EditAppModal at the bottom of the return (before the closing `</>`), same as in the original AppMgmt.tsx:

```typescript
      {editingApp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} role="dialog" aria-modal="true">
          <div className="card" style={{ width: 360, boxShadow: "var(--shadow-float)" }}>
            <div className="card-title">编辑应用</div>
            {/* ... inline edit form matching AppMgmt's EditAppModal ... */}
          </div>
        </div>
      )}
```

For the EditAppModal, either inline the form JSX directly or keep the component pattern from AppMgmt. Inline is simpler since it's a single-use modal.

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: Clean — all pages should now compile.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: merge AppMgmt into Settings page"
```

---

### Task 7: Delete old pages and final cleanup

**Files:**
- Delete: `src/pages/Today.tsx`
- Delete: `src/pages/Timeline.tsx`
- Delete: `src/pages/History.tsx`
- Delete: `src/pages/AppMgmt.tsx`
- Modify: `src/App.tsx` (if any stale imports remain)

- [ ] **Step 1: Delete the 4 obsolete page files**

```bash
rm src/pages/Today.tsx
rm src/pages/Timeline.tsx
rm src/pages/History.tsx
rm src/pages/AppMgmt.tsx
```

- [ ] **Step 2: Verify no dangling imports**

Run: `grep -r "Today\|Timeline\|History\|AppMgmt" src/ --include="*.tsx" --include="*.ts"`

Expected: No results (all references should have been removed in Tasks 1-6).

If any remain, fix them.

- [ ] **Step 3: Full type-check**

Run: `npx tsc -b --noEmit`
Expected: Clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete merged pages (Today, Timeline, History, AppMgmt)"
```

---

### Task 8: Smoke test

- [ ] **Step 1: Run dev server**

Run: `npm run tauri dev`

- [ ] **Step 2: Verify all 4 pages load**

Click each sidebar item:
1. 总览 — should show "今天" tab by default with stat cards
2. 活动 — should show calendar + empty timeline (or data if tracking)
3. 统计 — should show heatmap first, then trend chart, then ranking
4. 设置 — should show tracking settings, appearance, app management, system

- [ ] **Step 3: Verify tab switching in Overview**

1. Click "7天" — stat cards change to cumulative summary
2. Click "今天" — date resets to today, shows today's data
3. Click "14天" — shows 14-day summary
4. Click back to "今天" — resets again

- [ ] **Step 4: Verify Activity page interaction**

1. Click a date in the calendar — right panel updates
2. Check timeline Gantt renders correctly
3. Check app list below timeline shows data

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: smoke test fixes for page restructure"
```
