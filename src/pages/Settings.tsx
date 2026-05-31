import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { check } from "@tauri-apps/plugin-updater";
import { X, Trash2, Pencil, Plus } from "lucide-react";
import { COLOR_PRESETS, applyColorTheme, accentToGradient } from "../colorThemes";
import type { App, Category } from "../types";

const PRESET_COLORS = ["#B4A0FF","#E8A0FF","#A0C0FF","#FFB6C1","#C8A0E0","#D8B0FF","#E0B0F0","#C0B0E8","#D0C0F0","#B8C8E8"];

function EditAppModal({ app, categories, onSave, onClose }: {
  app: App;
  categories: Category[];
  onSave: (id: number, name: string, color: string, categoryId: number | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(app.name);
  const [color, setColor] = useState(app.color);
  const [catId, setCatId] = useState<number | null>(app.category_id);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} role="dialog" aria-modal="true" aria-label="编辑应用">
      <div className="card" style={{ width: 360, boxShadow: "var(--shadow-float)" }}>
        <div className="card-title">编辑应用</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>显示名称</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>分类</div>
            <select className="select" style={{ width: "100%" }} value={catId ?? ""} onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">无分类</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>颜色</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`选择颜色 ${c}`} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: c, cursor: "pointer", outline: color === c ? "2px solid var(--text-primary)" : "none", outlineOffset: 2, border: "none", padding: 0 }} />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="自定义颜色" style={{ width: 24, height: 24, border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={() => { onSave(app.id, name, color, catId); onClose(); }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, saveSetting, setTheme, theme, apps, categories, loadApps, loadCategories } = useAppStore();
  const [mergeInterval, setMergeInterval] = useState(settings.merge_interval ?? "30");
  const [tags, setTags] = useState<string[]>(() =>
    (settings.continuous_apps ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  const [tagInput, setTagInput] = useState("");
  const [excludedTags, setExcludedTags] = useState<string[]>(() =>
    (settings.excluded_processes ?? "explorer,msrdc,searchhost,runtimebroker,svchost,taskhostw,shellexperiencehost,startmenuexperiencehost,lockapp,textinputhost,ctfmon,dwm")
      .split(",").map((s) => s.trim()).filter(Boolean)
  );
  const [excludeInput, setExcludeInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [colorPreset, setColorPreset] = useState(settings.color_preset ?? "lavender");
  const [customAccent, setCustomAccent] = useState(settings.custom_accent ?? "#B4A0FF");
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#B4A0FF");
  const [appSearch, setAppSearch] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const excludeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<boolean>("get_auto_start").then(setAutoStart).catch(console.error);
  }, []);

  function addTag(value: string, list: string[], setList: (f: (p: string[]) => string[]) => void, setInput: (v: string) => void) {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !list.includes(trimmed)) setList((prev) => [...prev, trimmed]);
    setInput("");
  }

  function removeTag(tag: string, setList: (f: (p: string[]) => string[]) => void) {
    setList((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSave() {
    await saveSetting("merge_interval", mergeInterval);
    await saveSetting("continuous_apps", tags.join(","));
    await saveSetting("excluded_processes", excludedTags.join(","));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    const path = await save({ filters: [{ name: "JSON", extensions: ["json"] }], defaultPath: "chrona-backup.json" });
    if (path) await invoke("export_data", { path });
  }

  async function handleImport() {
    const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (path) await invoke("import_data", { path });
  }

  async function handleAutoStartToggle() {
    const newValue = !autoStart;
    await invoke("set_auto_start", { enabled: newValue });
    setAutoStart(newValue);
    await saveSetting("auto_start", String(newValue));
  }

  async function handlePresetChange(presetId: string) {
    setColorPreset(presetId);
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      applyColorTheme(preset.g1, preset.g2);
      await saveSetting("color_preset", presetId);
      await saveSetting("custom_accent", "");
    }
  }

  async function handleCustomColor(hex: string) {
    setCustomAccent(hex);
    setColorPreset("custom");
    const [g1, g2] = accentToGradient(hex);
    applyColorTheme(g1, g2);
    await saveSetting("color_preset", "custom");
    await saveSetting("custom_accent", hex);
  }

  async function handleCheckUpdate() {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const update = await check();
      if (update) {
        setUpdateStatus(`发现新版本 v${update.version}，正在下载...`);
        await update.downloadAndInstall();
        setUpdateStatus("更新已下载，请重启应用");
      } else {
        setUpdateStatus("当前已是最新版本");
      }
    } catch (e) {
      setUpdateStatus(`检查更新失败: ${e}`);
    } finally {
      setChecking(false);
    }
  }

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

  function TagInput({
    tags, input, setInput, inputRef, onAdd, onRemove, placeholder, quickAdd,
  }: {
    tags: string[]; input: string; setInput: (v: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onAdd: (v: string) => void; onRemove: (t: string) => void;
    placeholder: string; quickAdd?: string[];
  }) {
    return (
      <div>
        <div
          style={{
            display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 8px",
            border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-primary)", cursor: "text", minHeight: 40,
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((t) => (
            <span key={t} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", borderRadius: 999,
              backgroundColor: "var(--accent-light)", color: "var(--accent)",
              fontSize: 12, fontWeight: 500,
            }}>
              {t}
              <X size={12} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onRemove(t); }} />
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && input.trim()) {
                e.preventDefault();
                onAdd(input);
              } else if (e.key === "Backspace" && !input && tags.length > 0) {
                onRemove(tags[tags.length - 1]);
              }
            }}
            placeholder={tags.length === 0 ? placeholder : ""}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-primary)", minWidth: 120, flex: 1 }}
          />
        </div>
        {quickAdd && quickAdd.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {quickAdd.map((a) => (
              <button key={a} className="btn btn-sm" style={{ fontSize: 11 }}
                onClick={() => onAdd(a)}>+ {a}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="page-header"><h2>设置</h2></div>
      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div className="card-title">追踪设置</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>合并间隔（秒）</label>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                在此时间内切回同一应用，合并为一条记录
              </div>
              <input className="input" type="number" min={0} max={300} style={{ width: 120 }}
                value={mergeInterval} onChange={(e) => setMergeInterval(e.target.value)} aria-label="合并间隔（秒）" />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>持续记录应用</label>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                即使无键鼠操作也持续计时（匹配进程名关键词，回车或逗号确认）
              </div>
              <TagInput
                tags={tags} input={tagInput} setInput={setTagInput} inputRef={tagInputRef}
                onAdd={(v) => addTag(v, tags, setTags, setTagInput)}
                onRemove={(t) => removeTag(t, setTags)}
                placeholder="例如: vlc, mpv, spotify"
                quickAdd={apps.slice(0, 10).map((a) => a.name.toLowerCase()).filter((n) => !tags.includes(n))}
              />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>排除进程</label>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                不统计这些进程（匹配进程名，回车或逗号确认）
              </div>
              <TagInput
                tags={excludedTags} input={excludeInput} setInput={setExcludeInput} inputRef={excludeInputRef}
                onAdd={(v) => addTag(v, excludedTags, setExcludedTags, setExcludeInput)}
                onRemove={(t) => removeTag(t, setExcludedTags)}
                placeholder="例如: explorer, msrdc"
              />
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
            <button className={`btn ${theme === "light" ? "btn-primary" : ""}`}
              onClick={() => { setTheme("light"); saveSetting("theme", "light"); }}>浅色</button>
            <button className={`btn ${theme === "dark" ? "btn-primary" : ""}`}
              onClick={() => { setTheme("dark"); saveSetting("theme", "dark"); }}>深色</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">色彩主题</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                title={p.name}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${p.g1}, ${p.g2})`,
                  border: colorPreset === p.id ? "3px solid var(--text-primary)" : "2px solid var(--border)",
                  cursor: "pointer",
                  outline: colorPreset === p.id ? "2px solid var(--accent)" : "none",
                  outlineOffset: 2,
                  transition: "border var(--transition), outline var(--transition)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>自定义</span>
            <input
              type="color"
              value={colorPreset === "custom" ? customAccent : "#B4A0FF"}
              onChange={(e) => handleCustomColor(e.target.value)}
              style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 0, background: "none" }}
            />
            {colorPreset === "custom" && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {customAccent.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>应用列表 ({apps.length})</div>
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
                          <button className="btn btn-sm" onClick={() => setEditingApp(app)} title="编辑" aria-label="编辑"><Pencil size={14} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteApp(app.id)} title="删除" aria-label="删除"><Trash2 size={14} /></button>
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

        <div className="card">
          <div className="card-title">系统</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>开机自启</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Windows 启动时自动运行 Chrona</div>
            </div>
            <button className={`btn btn-sm ${autoStart ? "btn-primary" : ""}`}
              onClick={handleAutoStartToggle}>
              {autoStart ? "已开启" : "已关闭"}
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

        <div className="card">
          <div className="card-title">更新</div>
          <button className="btn" onClick={handleCheckUpdate} disabled={checking}>
            {checking ? "检查中..." : "检查更新"}
          </button>
          {updateStatus && (
            <div style={{ marginTop: 8, fontSize: 13, color: updateStatus.includes("失败") ? "var(--danger)" : "var(--text-secondary)" }}>
              {updateStatus}
            </div>
          )}
        </div>
      </div>

      {editingApp && (
        <EditAppModal
          app={editingApp}
          categories={categories}
          onSave={handleSaveApp}
          onClose={() => setEditingApp(null)}
        />
      )}
    </>
  );
}
