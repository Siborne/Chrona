import { useState, useRef } from "react";
import { useAppStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";

export default function SettingsPage() {
  const { settings, saveSetting, setTheme, theme, apps } = useAppStore();
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
  const tagInputRef = useRef<HTMLInputElement>(null);
  const excludeInputRef = useRef<HTMLInputElement>(null);

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
                value={mergeInterval} onChange={(e) => setMergeInterval(e.target.value)} />
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
