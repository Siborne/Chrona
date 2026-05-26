import { useState } from "react";
import { useAppStore } from "../store";
import type { App, Category } from "../types";
import { Trash2, Pencil, Plus } from "lucide-react";

const PRESET_COLORS = ["#6366f1","#f59e0b","#22c55e","#ef4444","#3b82f6","#ec4899","#14b8a6","#f97316","#8b5cf6","#64748b"];

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div className="card" style={{ width: 360, boxShadow: "var(--shadow-lg)" }}>
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
                <div key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: c, cursor: "pointer", outline: color === c ? "2px solid var(--text-primary)" : "none", outlineOffset: 2 }} />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 24, height: 24, border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }} />
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
  const [newCatColor, setNewCatColor] = useState("#6366f1");
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
            <input className="input" style={{ width: 200 }} placeholder="搜索应用..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                          <button className="btn btn-sm" onClick={() => setEditingApp(app)} title="编辑"><Pencil size={14} /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteApp(app.id)} title="删除"><Trash2 size={14} /></button>
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
