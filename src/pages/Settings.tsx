import { useState } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export default function SettingsPage() {
  const { settings, saveSetting, setTheme, theme, apps } = useAppStore();
  const [mergeInterval, setMergeInterval] = useState(settings.merge_interval ?? "30");
  const [continuousApps, setContinuousApps] = useState(settings.continuous_apps ?? "");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await saveSetting("merge_interval", mergeInterval);
    await saveSetting("continuous_apps", continuousApps);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    const path = await save({ filters: [{ name: "JSON", extensions: ["json"] }], defaultPath: "chrona-backup.json" });
    if (path) {
      await invoke("export_data", { path });
    }
  }

  async function handleImport() {
    const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (path) {
      await invoke("import_data", { path });
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>设置</h2>
      </div>
      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-title">追踪设置</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>合并间隔（秒）</label>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                在此时间内切回同一应用，合并为一条记录
              </div>
              <input
                className="input"
                type="number"
                min={0}
                max={300}
                style={{ width: 120 }}
                value={mergeInterval}
                onChange={(e) => setMergeInterval(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>持续记录应用</label>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                即使无键鼠操作也持续计时（逗号分隔，匹配进程路径关键词）
              </div>
              <input
                className="input"
                placeholder="例如: vlc, mpv, spotify"
                value={continuousApps}
                onChange={(e) => setContinuousApps(e.target.value)}
              />
              {apps.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {apps.slice(0, 10).map((a) => (
                    <button
                      key={a.id}
                      className="btn btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        const keyword = a.name.toLowerCase();
                        const current = continuousApps.split(",").map((s) => s.trim()).filter(Boolean);
                        if (!current.includes(keyword)) {
                          setContinuousApps([...current, keyword].join(", "));
                        }
                      }}
                    >
                      + {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <button className="btn btn-primary" onClick={handleSave}>
                {saved ? "已保存 ✓" : "保存设置"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">外观</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ${theme === "light" ? "btn-primary" : ""}`}
              onClick={() => { setTheme("light"); saveSetting("theme", "light"); }}
            >
              浅色
            </button>
            <button
              className={`btn ${theme === "dark" ? "btn-primary" : ""}`}
              onClick={() => { setTheme("dark"); saveSetting("theme", "dark"); }}
            >
              深色
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">数据管理</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={handleExport}>导出备份</button>
            <button className="btn" onClick={handleImport}>导入恢复</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            导出包含应用配置、分类和设置（不含历史记录）
          </div>
        </div>
      </div>
    </>
  );
}
