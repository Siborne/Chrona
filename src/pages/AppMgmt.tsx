import { useState } from "react";
import { useAppStore } from "../store";
import type { App, Category } from "../types";
import { Trash2, Pencil, Plus } from "lucide-react";
import Select from "../components/Select";
import ColorPicker from "../components/ColorPicker";

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
              {PRESET_COLORS.map((c) => (
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

export default function AppMgmt() {
  const { apps, categories, updateApp, deleteApp, createCategory, deleteCategory } = useAppStore();
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#B4A0FF");
  const [search, setSearch] = useState("");

  const filtered = apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  async function handleSaveApp(id: number, name: string, color: string, categoryId: number | null) {
    await updateApp(id, { name, color, category_id: categoryId });
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    await createCategory(newCatName.trim(), newCatColor);
    setNewCatName("");
  }

  return (
    <>
      <div className="page-header">
        <h2>应用管理</h2>
      </div>
      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>应用列表 ({apps.length})</div>
            <input className="input" style={{ width: 200 }} placeholder="搜索应用..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="搜索应用" />
          </div>
          {filtered.length === 0 ? (
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
                {filtered.map((app) => {
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
                          <button className="btn btn-sm btn-danger" onClick={() => deleteApp(app.id)} title="删除" aria-label="删除"><Trash2 size={14} /></button>
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
            <ColorPicker value={newCatColor} onChange={setNewCatColor} size={32} />
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
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1 }} onClick={() => deleteCategory(c.id)}>×</button>
                </div>
              ))}
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
