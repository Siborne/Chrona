import { useEffect } from "react";
import { useAppStore } from "./store";
import {
  BarChart3,
  Clock,
  CalendarDays,
  TrendingUp,
  AppWindow,
  Settings,
  Download,
} from "lucide-react";
import type { PageId } from "./types";
import html2canvas from "html2canvas";

import Today from "./pages/Today";
import Timeline from "./pages/Timeline";
import History from "./pages/History";
import Stats from "./pages/Stats";
import AppMgmt from "./pages/AppMgmt";
import SettingsPage from "./pages/Settings";

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Clock }[] = [
  { id: "today", label: "今天", icon: Clock },
  { id: "timeline", label: "时间线", icon: BarChart3 },
  { id: "history", label: "历史", icon: CalendarDays },
  { id: "stats", label: "数据统计", icon: TrendingUp },
  { id: "apps", label: "应用管理", icon: AppWindow },
  { id: "settings", label: "设置", icon: Settings },
];

const PAGE_COMPONENTS: Record<PageId, React.FC> = {
  today: Today,
  timeline: Timeline,
  history: History,
  stats: Stats,
  apps: AppMgmt,
  settings: SettingsPage,
};

async function exportScreenshot() {
  const el = document.querySelector(".main-content") as HTMLElement;
  if (!el) return;
  const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
  const link = document.createElement("a");
  link.download = `chrona-${new Date().toISOString().split("T")[0]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function App() {
  const { currentPage, setCurrentPage, theme, loadApps, loadCategories, loadSettings } =
    useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadApps();
    loadCategories();
    loadSettings();
  }, [loadApps, loadCategories, loadSettings]);

  const PageComponent = PAGE_COMPONENTS[currentPage];

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <svg viewBox="0 0 100 100">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#grad)" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="white" strokeWidth="3" />
            <line x1="50" y1="50" x2="50" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="50" x2="68" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3" fill="white" />
          </svg>
          <h1>Chrona</h1>
        </div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "8px 8px 0" }}>
          <button className="nav-item" style={{ width: "100%" }} onClick={exportScreenshot}>
            <Download />
            导出截图
          </button>
        </div>
      </nav>
      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}

export default App;
