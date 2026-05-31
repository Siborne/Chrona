import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TrendData, HeatmapData, AppUsageStats } from "../types";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatDuration } from "../utils";
import { getChartColors } from "../colorThemes";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBanner from "../components/ErrorBanner";

function TrendChart({ days }: { days: number }) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<TrendData[]>("get_trend_data", { days })
      .then(setData)
      .catch(e => { console.error("get_trend_data failed:", e); setError(e.toString()); })
      .finally(() => setLoading(false));
  }, [days, refreshKey]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />;

  // Pivot: date → { date, appName: duration }
  const dates = [...new Set(data.map((d) => d.date))].sort();
  const appNames = [...new Set(data.map((d) => d.app_name))].slice(0, 8);
  const pivoted = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const app of appNames) {
      const point = data.find((d) => d.date === date && d.app_name === app);
      row[app] = point ? Math.round(point.duration / 60000) : 0;
    }
    return row;
  });

  const COLORS = getChartColors();

  if (pivoted.length === 0) return <div className="empty-state" style={{ minHeight: 280 }}><p>暂无数据</p></div>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={pivoted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
        <Tooltip formatter={(v: number) => `${v}m`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {appNames.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Heatmap() {
  const year = new Date().getFullYear();
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<HeatmapData[]>("get_heatmap_data", { year })
      .then(setData)
      .catch(e => { console.error("get_heatmap_data failed:", e); setError(e.toString()); })
      .finally(() => setLoading(false));
  }, [year, refreshKey]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />;

  const dataMap = new Map(data.map((d) => [d.date, d]));

  // Build weeks grid starting from Jan 1
  const jan1 = new Date(year, 0, 1);
  const startOffset = jan1.getDay(); // 0=Sun
  const totalDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(year, 0, i + 1);
      return d.toISOString().split("T")[0];
    }),
  ];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const CELL_SIZE = 14;
  const CELL_GAP = 3;

  return (
    <div>
      <div style={{ display: "flex", gap: CELL_GAP, overflowX: "auto", paddingBottom: 8, minHeight: CELL_SIZE * 7 + CELL_GAP * 6 + 20 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: CELL_GAP }}>
            {week.map((date, di) => {
              if (!date) return <div key={di} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
              const d = dataMap.get(date);
              return (
                <div
                  key={di}
                  className={`heatmap-cell level-${d?.level ?? 0}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={date + (d ? ` · ${formatDuration(d.duration)}` : "")}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {MONTHS.map((m) => <span key={m} style={{ fontSize: 10, color: "var(--text-muted)", flex: 1 }}>{m}</span>)}
      </div>
    </div>
  );
}

export default function Stats() {
  const [days, setDays] = useState(7);
  const [ranking, setRanking] = useState<AppUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    invoke<AppUsageStats[]>("get_cumulative_ranking")
      .then(setRanking)
      .catch(e => { console.error("get_cumulative_ranking failed:", e); setError(e.toString()); })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <>
      <div className="page-header">
        <h2>统计</h2>
      </div>
      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ minHeight: 200 }}>
          <div className="card-glow" />
          <div className="card-title">年度活跃热力图 · {new Date().getFullYear()}</div>
          <Heatmap />
        </div>

        <div className="card" style={{ minHeight: 400 }}>
          <div className="card-glow" />
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

        <div className="card" style={{ minHeight: 300 }}>
          <div className="card-glow" />
          <div className="card-title">累计使用排行</div>
          {loading && <LoadingSpinner />}
          {error && <ErrorBanner message={error} onRetry={() => setRefreshKey(k => k + 1)} />}
          {!loading && !error && (
            ranking.length === 0 ? (
              <div className="empty-state"><p>暂无数据</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>应用</th>
                    <th>累计时长</th>
                    <th>会话数</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.app_id}>
                      <td style={{ color: "var(--text-muted)", width: 32 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="color-dot" style={{ backgroundColor: r.app_color }} />
                          {r.app_name}
                        </div>
                      </td>
                      <td className="duration-text">{formatDuration(r.total_duration)}</td>
                      <td style={{ color: "var(--text-muted)" }}>{r.session_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </>
  );
}
