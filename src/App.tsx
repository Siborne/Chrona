import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import {
  BarChart3,
  Clock,
  CalendarDays,
  TrendingUp,
  Settings,
  Download,
} from "lucide-react";
import type { PageId } from "./types";
import html2canvas from "html2canvas";
import { applyTimeTheme, getTimeTheme, formatTimeHM } from "./theme";
import { COLOR_PRESETS, applyColorTheme, accentToGradient } from "./colorThemes";

import Overview from "./pages/Overview";
import Activity from "./pages/Activity";
import Stats from "./pages/Stats";
import SettingsPage from "./pages/Settings";

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Clock }[] = [
  { id: "overview", label: "总览", icon: BarChart3 },
  { id: "activity", label: "活动", icon: CalendarDays },
  { id: "stats", label: "统计", icon: TrendingUp },
  { id: "settings", label: "设置", icon: Settings },
];

const PAGE_COMPONENTS: Record<PageId, React.FC> = {
  overview: Overview,
  activity: Activity,
  stats: Stats,
  settings: SettingsPage,
};

async function exportScreenshot() {
  const el = document.querySelector(".main-content") as HTMLElement;
  if (!el) return;
  const canvas = await html2canvas(el, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() || "#ffffff", scale: 2 });
  const link = document.createElement("a");
  link.download = `chrona-${new Date().toISOString().split("T")[0]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function Greeting() {
  const theme = getTimeTheme();
  const [now, setNow] = useState(formatTimeHM(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(formatTimeHM(new Date())), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sidebar-greeting">
      <span className="sidebar-greeting-label">{theme.emoji} {theme.label}</span>
      <span className="sidebar-greeting-time">{now}</span>
    </div>
  );
}

function App() {
  const { currentPage, setCurrentPage, theme, settings, loadApps, loadCategories, loadSettings } =
    useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Apply time-aware accent colors and refresh every 5 minutes
  useEffect(() => {
    applyTimeTheme();
    const id = setInterval(applyTimeTheme, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Apply color theme from settings
  useEffect(() => {
    const presetId = settings.color_preset;
    if (!presetId) return; // not loaded yet
    if (presetId === "custom") {
      const hex = settings.custom_accent;
      if (hex) {
        const [g1, g2] = accentToGradient(hex);
        applyColorTheme(g1, g2);
      }
    } else {
      const preset = COLOR_PRESETS.find((p) => p.id === presetId);
      if (preset) applyColorTheme(preset.g1, preset.g2);
    }
  }, [settings.color_preset, settings.custom_accent]);

  useEffect(() => {
    loadApps();
    loadCategories();
    loadSettings();
  }, [loadApps, loadCategories, loadSettings]);

  const PageComponent = PAGE_COMPONENTS[currentPage];

  return (
    <div className="app-layout">
      <nav className="sidebar" role="navigation" aria-label="主导航">
        <div className="sidebar-logo">
          <svg viewBox="0 0 100 100">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--gradient-start)" />
                <stop offset="100%" stopColor="var(--gradient-end)" />
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
        <Greeting />
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                onClick={() => setCurrentPage(item.id)}
                aria-label={item.label}
                aria-current={currentPage === item.id ? "page" : undefined}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "8px 8px 0" }}>
          <button className="nav-item" style={{ width: "100%" }} onClick={exportScreenshot} aria-label="导出截图">
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
