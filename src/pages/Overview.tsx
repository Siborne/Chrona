import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { TrendingUp, Calendar, BarChart3, Trophy, Clock, List } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, BarChart, Bar } from "recharts";
import { formatDuration, MS_PER_HOUR } from "../utils";
import { getChartColors } from "../colorThemes";
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
// 稳定调色板：基于应用名称哈希分配颜色，同一应用始终同色
const APP_COLORS = [
  "#6366F1", "#818CF8", "#F43F5E", "#10B981", "#06B6D4",
  "#D97706", "#8B5CF6", "#EF4444", "#F59E0B", "#EC4899",
  "#14B8A6", "#3B82F6", "#F97316", "#22D3EE", "#A855F7",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function appColor(name: string, existing?: string | null): string {
  if (existing && existing.length > 0) return existing;
  return APP_COLORS[hashName(name) % APP_COLORS.length];
}

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
                <div
                  className={`hourly-bar ${height === 0 ? 'empty' : ''}`}
                  style={{
                    height: `${Math.max(height, height > 0 ? 3 : 0)}%`,
                    minHeight: height > 0 ? 3 : 3,
                  }}
                  title={`${i}:00 — ${formatDuration(hourData?.duration || 0)}`}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", borderTop: "1px solid var(--hairline)", paddingTop: 4 }}>
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
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (cat.total_duration / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${cat.category_color ?? "#94a3b8"}, var(--accent-soft))` }} />
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
            <div className="progress-bar-fill" style={{ width: `${total > 0 ? (app.total_duration / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${app.app_color}, var(--accent-soft))` }} />
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
          <div key={s.id} className="session-row">
            <span className="color-dot" style={{ backgroundColor: app?.color ?? "#888", color: app?.color ?? "#888" }} />
            <span className="session-app">
              {app?.name ?? "Unknown"}
              {s.title && <span className="session-title">— {s.title}</span>}
            </span>
            <span className="session-time">{formatTime(s.started_at)}</span>
            <span className="duration-mono">{formatDuration(dur)}</span>
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

  const { chartPalette } = useAppStore();
  const dates = [...new Set(data.map((d) => d.date))].sort();
  const appNames = [...new Set(data.map((d) => d.app_name))].slice(0, 6);
  const COLORS = getChartColors(chartPalette);

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
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-value">{formatDuration(totalMs)}</div>
        <div className="stat-label">累计使用 · {days} 天</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatDuration(avgMs)}</div>
        <div className="stat-label">日均使用</div>
      </div>
      <div className="stat-card">
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

  const appPieData = stats.map((s) => ({ name: s.app_name, value: s.total_duration, color: appColor(s.app_name, s.app_color) }));

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
                <div className="stat-row">
                  <div className="stat-card">
                    <div className="stat-value">{formatDuration(totalTime)}</div>
                    <div className="stat-label">总使用时长</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.length}</div>
                    <div className="stat-label">活跃应用数</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">记录会话数</div>
                  </div>
                </div>

                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">应用占比</div>
                    {appPieData.length === 0 ? (
                      <div className="empty-state"><Clock /><p>暂无使用记录</p></div>
                    ) : (
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 120, flexShrink: 0 }}>
                          <ResponsiveContainer width={120} height={120}>
                            <PieChart>
                              <Pie data={appPieData} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={54}>
                                {appPieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                              </Pie>
                              <ReTooltip formatter={(v: number) => formatDuration(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", maxHeight: 180 }}>
                          {appPieData.slice(0, 6).map((d) => (
                            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--hairline)" }}>
                              <span className="color-dot" style={{ backgroundColor: d.color, color: d.color }} />
                              <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                              <span className="duration-mono">{formatDuration(d.value)}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)", width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{totalTime > 0 ? `${Math.round((d.value / totalTime) * 100)}%` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card span-4">
                    <div className="card-glow" />
                    <div className="card-title">分类分布</div>
                    <CategoryBars data={catStats} />
                  </div>
                  <div className="card span-3">
                    <div className="card-glow" />
                    <div className="card-title">应用排行</div>
                    <TopAppsList stats={stats} total={totalTime} />
                  </div>
                </div>

                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-7">
                    <div className="card-glow" />
                    <div className="card-title">24小时分布</div>
                    <HourlyChart date={dateStr} />
                  </div>
                  <div className="card span-5">
                    <div className="card-glow" />
                    <div className="card-title">今日洞察</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--accent-dim)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(99,102,241,0.1)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent), var(--accent-soft))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{catStats[0]?.category_name || "开发"}时间占比最高</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>今日主要专注领域</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--accent-soft), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>专注时段分析</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>查看24小时分布了解峰值</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bento" style={{ marginBottom: 12 }}>
                  <div className="card span-12">
                    <div className="card-glow" />
                    <div className="card-title">最近会话</div>
                    <RecentSessions sessions={sessions} apps={apps} />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <WeeklySummary days={multiDays} />
            <div className="bento" style={{ marginTop: 12, marginBottom: 12 }}>
              <div className="card span-6">
                <div className="card-glow" />
                <div className="card-title">每日使用量</div>
                <DailyBarChart days={multiDays} />
              </div>
              <div className="card span-6">
                <div className="card-glow" />
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
