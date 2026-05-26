import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { Clock } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface AppUsageStats {
  app_id: number;
  app_name: string;
  app_color: string;
  total_duration: number;
  session_count: number;
}

interface CategoryUsageStat {
  category_id: number | null;
  category_name: string;
  category_color: string | null;
  total_duration: number;
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function HourlyChart({ date }: { date: string }) {
  const [data, setData] = useState<{ hour: number; duration: number }[]>([]);

  useEffect(() => {
    invoke<{ hour: number; duration: number }[]>("get_hourly_distribution", { date })
      .then(setData).catch(console.error);
  }, [date]);

  if (data.length === 0) return <div className="empty-state" style={{ height: 180 }}><p>暂无数据</p></div>;

  const maxDuration = Math.max(...data.map((d) => d.duration), 1);
  const yLabels = [maxDuration, maxDuration * 0.5, 0];

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {/* Y axis */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 20, width: 36, flexShrink: 0 }}>
        {yLabels.map((v, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>
            {formatDuration(v)}
          </span>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {/* Bars */}
        <div style={{ display: "flex", alignItems: "flex-end", height: 160, gap: 2 }}>
          {Array.from({ length: 24 }, (_, i) => {
            const hourData = data.find((d) => d.hour === i);
            const height = hourData ? (hourData.duration / maxDuration) * 100 : 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div
                  style={{
                    height: `${Math.max(height, height > 0 ? 2 : 0)}%`,
                    backgroundColor: "var(--accent)",
                    borderRadius: "2px 2px 0 0",
                    opacity: height > 0 ? 0.85 : 0.15,
                    minHeight: height > 0 ? 2 : 0,
                  }}
                  title={`${i}:00 — ${formatDuration(hourData?.duration || 0)}`}
                />
              </div>
            );
          })}
        </div>
        {/* X axis */}
        <div style={{ display: "flex", borderTop: "1px solid var(--border)", paddingTop: 4 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--text-muted)" }}>
              {i % 6 === 0 ? `${i}` : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieSection({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  if (data.length === 0) return <div className="empty-state"><Clock /><p>今天还没有使用记录</p></div>;

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={60}
              onMouseEnter={(_, i) => setActive(data[i].name)}
              onMouseLeave={() => setActive(null)}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} opacity={active === null || active === d.name ? 1 : 0.4} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatDuration(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 200 }}>
        {data.map((d) => (
          <div key={d.name}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)", opacity: active === null || active === d.name ? 1 : 0.5 }}
            onMouseEnter={() => setActive(d.name)} onMouseLeave={() => setActive(null)}>
            <span className="color-dot" style={{ backgroundColor: d.color }} />
            <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            <span className="duration-text" style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatDuration(d.value)}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", width: 36, textAlign: "right" }}>
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Today() {
  const { selectedDate } = useAppStore();
  const [stats, setStats] = useState<AppUsageStats[]>([]);
  const [catStats, setCatStats] = useState<CategoryUsageStat[]>([]);
  const [tab, setTab] = useState<"app" | "category">("app");

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const totalTime = stats.reduce((s, a) => s + a.total_duration, 0);

  useEffect(() => {
    invoke<AppUsageStats[]>("get_app_usage_for_date", { date: dateStr }).then(setStats).catch(console.error);
    invoke<CategoryUsageStat[]>("get_category_usage_for_date", { date: dateStr }).then(setCatStats).catch(console.error);
  }, [dateStr]);

  const appPieData = stats.map((s) => ({ name: s.app_name, value: s.total_duration, color: s.app_color }));
  const catPieData = catStats.map((s) => ({ name: s.category_name, value: s.total_duration, color: s.category_color ?? "#94a3b8" }));
  const catTotal = catStats.reduce((s, a) => s + a.total_duration, 0);

  return (
    <>
      <div className="page-header">
        <h2>今天</h2>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{formatDuration(totalTime)} 总计</span>
      </div>
      <div className="page-body">
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="stat-label">总使用时长</div>
            <div className="stat-value">{formatDuration(totalTime)}</div>
          </div>
          <div className="card">
            <div className="stat-label">活跃应用数</div>
            <div className="stat-value">{stats.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">记录会话数</div>
            <div className="stat-value">{stats.reduce((s, a) => s + a.session_count, 0)}</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="card-title" style={{ margin: 0 }}>占比</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className={`btn btn-sm ${tab === "app" ? "btn-primary" : ""}`} onClick={() => setTab("app")}>应用</button>
                <button className={`btn btn-sm ${tab === "category" ? "btn-primary" : ""}`} onClick={() => setTab("category")}>分类</button>
              </div>
            </div>
            {tab === "app"
              ? <PieSection data={appPieData} total={totalTime} />
              : <PieSection data={catPieData} total={catTotal} />
            }
          </div>
          <div className="card">
            <div className="card-title">时间分布</div>
            <HourlyChart date={dateStr} />
          </div>
        </div>
      </div>
    </>
  );
}
