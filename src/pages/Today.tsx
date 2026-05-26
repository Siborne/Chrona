import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { Clock } from "lucide-react";

interface AppUsageStats {
  app_id: number;
  app_name: string;
  app_color: string;
  total_duration: number;
  session_count: number;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function HourlyChart({ date }: { date: string }) {
  const [data, setData] = useState<{ hour: number; duration: number }[]>([]);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      const hourlyData = await invoke<{ hour: number; duration: number }[]>(
        "get_hourly_distribution",
        { date }
      );
      setData(hourlyData);
    } catch (e) {
      console.error("Failed to load hourly data:", e);
    }
  };

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ height: 200 }}>
        <p>暂无数据</p>
      </div>
    );
  }

  const maxDuration = Math.max(...data.map((d) => d.duration), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 200, gap: 2, padding: "0 4px" }}>
      {Array.from({ length: 24 }, (_, i) => {
        const hourData = data.find((d) => d.hour === i);
        const height = hourData ? (hourData.duration / maxDuration) * 100 : 0;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(height, 1)}%`,
              backgroundColor: "var(--accent)",
              borderRadius: "2px 2px 0 0",
              opacity: height > 0 ? 0.8 : 0.2,
              transition: "height 300ms ease",
            }}
            title={`${i}:00 - ${formatDuration(hourData?.duration || 0)}`}
          />
        );
      })}
    </div>
  );
}

function Today() {
  const { selectedDate } = useAppStore();
  const [stats, setStats] = useState<AppUsageStats[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  const dateStr = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    loadTodayData();
  }, [dateStr]);

  const loadTodayData = async () => {
    try {
      const data = await invoke<AppUsageStats[]>("get_app_usage_for_date", { date: dateStr });
      setStats(data);
      setTotalTime(data.reduce((sum, s) => sum + s.total_duration, 0));
    } catch (e) {
      console.error("Failed to load today data:", e);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>今天</h2>
        <div className="page-header-actions">
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {formatDuration(totalTime)} 总计
          </span>
        </div>
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
            <div className="stat-value">
              {stats.reduce((sum, s) => sum + s.session_count, 0)}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">应用占比</div>
            {stats.length === 0 ? (
              <div className="empty-state">
                <Clock />
                <p>今天还没有使用记录</p>
              </div>
            ) : (
              <div>
                {stats.map((s) => (
                  <div
                    key={s.app_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span className="color-dot" style={{ backgroundColor: s.app_color }} />
                    <span style={{ flex: 1, fontSize: 14 }}>{s.app_name}</span>
                    <span className="duration-text" style={{ fontSize: 14 }}>
                      {formatDuration(s.total_duration)}
                    </span>
                    <div className="progress-bar" style={{ width: 80 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${totalTime > 0 ? (s.total_duration / totalTime) * 100 : 0}%`,
                          backgroundColor: s.app_color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

export default Today;
