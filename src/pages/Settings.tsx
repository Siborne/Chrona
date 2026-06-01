import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { check } from "@tauri-apps/plugin-updater";
import { X, Trash2, Pencil, Plus, Image } from "lucide-react";
import { COLOR_PRESETS, applyColorTheme, accentToGradient } from "../colorThemes";
import Select from "../components/Select";
import ColorPicker from "../components/ColorPicker";
import type { App, Category } from "../types";

const PRESET_COLORS = ["#6366F1","#818CF8","#F43F5E","#10B981","#06B6D4","#D97706","#8B5CF6","#EF4444","#A78BFA","#64748B"];

type SettingsTab = "tracking" | "appearance" | "apps" | "system";

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
      <div className="card" style={{ width: 360 }}>
        <div className="card-glow" />
        <div className="card-title">编辑应用</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>显示名称</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>分类</div>
            <Select
              options={[
                { value: "", label: "无分类" },
                ...categories.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  dotColor: c.color ?? "#888",
                })),
              ]}
              value={catId != null ? String(catId) : ""}
              onChange={(v) => setCatId(v ? Number(v) : null)}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>颜色</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESET_COLORS.slice(0, 10).map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`选择颜色 ${c}`} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: c, cursor: "pointer", outline: color === c ? "2px solid var(--text-primary)" : "none", outlineOffset: 2, border: "none", padding: 0 }} />
              ))}
              <ColorPicker value={color} onChange={setColor} size={24} />
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
  const { settings, saveSetting, setTheme, theme, navPosition, setNavPosition, fontFamily, setFontFamily, fontWeight, setFontWeight, bgIntensity, setBgIntensity, chartPalette, setChartPalette, heatmapScheme, setHeatmapScheme, apps, categories, loadApps, loadCategories, updateCategory } = useAppStore();
  const [tab, setTab] = useState<SettingsTab>("tracking");
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
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [colorPreset, setColorPreset] = useState(settings.color_preset ?? "indigo");
  const [customAccent, setCustomAccent] = useState(settings.custom_accent ?? "#B4A0FF");
  const [bgImage, setBgImage] = useState(settings.bg_image ?? "");
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#B4A0FF");
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("#B4A0FF");
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

  async function handleReset() {
    setResetting(true);
    try {
      await invoke("reset_data");
      setResetConfirm(false);
      loadApps();
      loadCategories();
    } catch (e) {
      console.error("Failed to reset data:", e);
    } finally {
      setResetting(false);
    }
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
    await invoke("update_app", { id, name, color, categoryId });
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
            border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)",
            backgroundColor: "var(--surface-1)", cursor: "text", minHeight: 40,
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

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "tracking", label: "追踪" },
    { id: "appearance", label: "外观" },
    { id: "apps", label: "应用" },
    { id: "system", label: "系统" },
  ];

  return (
    <>
      <div className="page-header">
        <h2>设置</h2>
        <div className="page-header-actions">
          <div className="segmented-control">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="page-body">
        {tab === "tracking" && (
          <div className="card" style={{ maxWidth: 640 }}>
            <div className="card-glow" />
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
                  即使无键鼠操作也持续计时（匹配进程名关键词，回车或逗号确认，或从下方点击添加）
                </div>
                <TagInput
                  tags={tags} input={tagInput} setInput={setTagInput} inputRef={tagInputRef}
                  onAdd={(v) => addTag(v, tags, setTags, setTagInput)}
                  onRemove={(t) => removeTag(t, setTags)}
                  placeholder="例如: vlc, mpv, spotify"
                />
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 160, overflowY: "auto", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
                  {apps.filter((a) => !tags.includes(a.name.toLowerCase())).slice(0, 50).map((a) => (
                    <button
                      key={a.id}
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => addTag(a.name.toLowerCase(), tags, setTags, setTagInput)}
                      title={a.exe_path}
                    >
                      <span className="color-dot" style={{ backgroundColor: a.color, color: a.color, width: 6, height: 6, marginRight: 4 }} />
                      {a.name.toLowerCase()}
                    </button>
                  ))}
                  {apps.filter((a) => !tags.includes(a.name.toLowerCase())).length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>所有应用已添加</span>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>排除进程</label>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                  不统计这些进程（匹配进程名，回车或逗号确认，或从下方点击添加）
                </div>
                <TagInput
                  tags={excludedTags} input={excludeInput} setInput={setExcludeInput} inputRef={excludeInputRef}
                  onAdd={(v) => addTag(v, excludedTags, setExcludedTags, setExcludeInput)}
                  onRemove={(t) => removeTag(t, setExcludedTags)}
                  placeholder="例如: explorer, msrdc"
                />
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 160, overflowY: "auto", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
                  {apps.filter((a) => !excludedTags.includes(a.name.toLowerCase())).map((a) => (
                    <button
                      key={a.id}
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => addTag(a.name.toLowerCase(), excludedTags, setExcludedTags, setExcludeInput)}
                      title={a.exe_path}
                    >
                      <span className="color-dot" style={{ backgroundColor: a.color, color: a.color, width: 6, height: 6, marginRight: 4 }} />
                      {a.name.toLowerCase()}
                    </button>
                  ))}
                  {apps.filter((a) => !excludedTags.includes(a.name.toLowerCase())).length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>所有应用已排除</span>
                  )}
                </div>
              </div>
              <div>
                <button className="btn btn-primary" onClick={handleSave}>
                  {saved ? "已保存 ✓" : "保存设置"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
            <div className="card">
              <div className="card-glow" />
              <div className="card-title">主题模式</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`btn ${theme === "light" ? "btn-primary" : ""}`}
                  onClick={() => { setTheme("light"); saveSetting("theme", "light"); }}>浅色</button>
                <button className={`btn ${theme === "dark" ? "btn-primary" : ""}`}
                  onClick={() => { setTheme("dark"); saveSetting("theme", "dark"); }}>深色</button>
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">字体</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  { id: "wenkai", label: "霞鹜文楷" },
                  { id: "noto", label: "思源黑体" },
                  { id: "inter", label: "Inter" },
                  { id: "system", label: "系统默认" },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`btn ${fontFamily === f.id ? "btn-primary" : ""}`}
                    onClick={() => { setFontFamily(f.id as any); saveSetting("font_family", f.id); }}
                    style={{ fontFamily: f.id === "wenkai" ? "'LXGW WenKai Screen', 'LXGW WenKai'" : f.id === "noto" ? "'Noto Sans SC', 'Noto Sans'" : f.id === "inter" ? "'Inter', sans-serif" : "inherit" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="card-title" style={{ marginBottom: 8, fontSize: 11 }}>字重</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { value: 500, label: "中等" },
                  { value: 700, label: "粗体" },
                ].map((w) => (
                  <button
                    key={w.value}
                    className={`btn ${fontWeight === w.value ? "btn-primary" : ""}`}
                    onClick={() => { setFontWeight(w.value); saveSetting("font_weight", String(w.value)); }}
                    style={{ fontWeight: w.value }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">导航位置</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn ${navPosition === "left" ? "btn-primary" : ""}`}
                  onClick={() => { setNavPosition("left"); saveSetting("nav_position", "left"); }}
                >
                  左侧边栏
                </button>
                <button
                  className={`btn ${navPosition === "bottom" ? "btn-primary" : ""}`}
                  onClick={() => { setNavPosition("bottom"); saveSetting("nav_position", "bottom"); }}
                >
                  底部浮动
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">背景强度</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(bgIntensity * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setBgIntensity(v);
                    saveSetting("bg_intensity", String(v));
                  }}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(bgIntensity * 100)}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                调整极光光晕和噪点纹理的强度，0% 为纯色背景
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">背景图片</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={async () => {
                  const path = await open({
                    filters: [{ name: "图片", extensions: ["jpg", "jpeg", "png", "webp", "gif"] }],
                    multiple: false,
                  });
                  if (!path) return;
                  try {
                    const bytes = await readFile(path as string);
                    const ext = (path as string).split(".").pop()?.toLowerCase() ?? "png";
                    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/png";
                    let binary = "";
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    const base64 = btoa(binary);
                    const dataUrl = `data:${mime};base64,${base64}`;
                    setBgImage(dataUrl);
                    await saveSetting("bg_image", dataUrl);
                  } catch (e) {
                    console.error("读取图片失败:", e);
                  }
                }}>
                  <Image size={14} /> 选择图片
                </button>
                {bgImage && (
                  <>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      已设置
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => { setBgImage(""); saveSetting("bg_image", ""); }}>清除</button>
                  </>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                设置后将覆盖极光背景，仅显示自定义图片。图片以 base64 存储在本地设置中。
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">图表调色板</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { id: "theme", label: "主题色" },
                  { id: "rainbow", label: "彩虹" },
                  { id: "pastel", label: "柔和" },
                  { id: "vivid", label: "鲜艳" },
                ].map((p) => (
                  <button
                    key={p.id}
                    className={`btn ${chartPalette === p.id ? "btn-primary" : ""}`}
                    onClick={() => { setChartPalette(p.id as any); saveSetting("chart_palette", p.id); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
              <div className="card-title">热力图颜色</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { id: "indigo", label: "靛蓝", color: "#6366F1" },
                  { id: "emerald", label: "翡翠", color: "#10B981" },
                  { id: "rose", label: "玫瑰", color: "#F43F5E" },
                  { id: "amber", label: "琥珀", color: "#D97706" },
                  { id: "cyan", label: "海洋", color: "#06B6D4" },
                ].map((s) => (
                  <button
                    key={s.id}
                    className={`btn ${heatmapScheme === s.id ? "btn-primary" : ""}`}
                    onClick={() => { setHeatmapScheme(s.id as any); saveSetting("heatmap_scheme", s.id); }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: s.color,
                        display: "inline-block",
                      }}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-glow" />
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
                      border: colorPreset === p.id ? "3px solid var(--text-primary)" : "2px solid var(--hairline)",
                      cursor: "pointer",
                      outline: colorPreset === p.id ? "2px solid var(--accent)" : "none",
                      outlineOffset: 2,
                      transition: "border var(--transition), outline var(--transition)",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0 0", borderTop: "1px solid var(--hairline)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>自定义</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ColorPicker
                    value={colorPreset === "custom" ? customAccent : "#6366F1"}
                    onChange={(c) => { handleCustomColor(c); }}
                    size={28}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" }}>
                    {colorPreset === "custom" ? customAccent.toUpperCase() : "选择颜色"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "apps" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-glow" />
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

            <div className="card" style={{ maxWidth: 640 }}>
              <div className="card-glow" />
              <div className="card-title">分类管理</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input className="input" placeholder="新分类名称" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()} />
                <ColorPicker value={newCatColor} onChange={setNewCatColor} size={32} />
                <button className="btn btn-primary" onClick={handleCreateCategory}><Plus size={16} />添加</button>
              </div>
              {categories.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>暂无分类</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((c) => (
                    editCatId === c.id ? (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 20, border: "1px solid var(--accent)", fontSize: 13, background: "var(--surface-1)" }}>
                        <ColorPicker value={editCatColor} onChange={setEditCatColor} size={22} />
                        <input className="input" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} style={{ width: 80, padding: "2px 6px", fontSize: 12 }} onKeyDown={(e) => { if (e.key === "Enter") { updateCategory(c.id, editCatName, editCatColor); setEditCatId(null); } }} />
                        <button className="btn btn-primary btn-sm" style={{ padding: "2px 8px" }} onClick={() => { updateCategory(c.id, editCatName, editCatColor); setEditCatId(null); }}>✓</button>
                        <button className="btn btn-sm" style={{ padding: "2px 6px" }} onClick={() => setEditCatId(null)}>×</button>
                      </div>
                    ) : (
                      <div
                        key={c.id}
                        onClick={() => { setEditCatId(c.id); setEditCatName(c.name); setEditCatColor(c.color ?? "#888"); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--hairline)", fontSize: 13, cursor: "pointer", transition: "border-color var(--transition)" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--hairline)"}
                        title="点击编辑"
                      >
                        <span className="color-dot" style={{ backgroundColor: c.color ?? "#888" }} />
                        {c.name}
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1 }} onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id); }}>×</button>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "system" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
            <div className="card">
              <div className="card-glow" />
              <div className="card-title">启动</div>
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
              <div className="card-glow" />
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
              <div className="card-glow" />
              <div className="card-title">重置数据</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                清除所有追踪记录和应用数据，恢复默认分类。此操作不可撤销。
              </div>
              {!resetConfirm ? (
                <button className="btn btn-danger" onClick={() => setResetConfirm(true)}>重置所有数据</button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#FF3B30" }}>确认重置？将删除所有数据。</span>
                  <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>
                    {resetting ? "重置中..." : "确认重置"}
                  </button>
                  <button className="btn" onClick={() => setResetConfirm(false)}>取消</button>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-glow" />
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
        )}
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
