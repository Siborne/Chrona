import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
import { COLOR_PRESETS, applyColorTheme, accentToGradient, applyHeatmapScheme } from "./colorThemes";

import Overview from "./pages/Overview";
import Activity from "./pages/Activity";
import Stats from "./pages/Stats";
import SettingsPage from "./pages/Settings";

function TitleBar() {
  const win = getCurrentWindow();

  function minimize() { win.minimize(); }
  function toggleMaximize() { win.toggleMaximize(); }
  function close() { win.close(); }

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-title">Chrona</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={minimize} aria-label="最小化">
          <svg viewBox="0 0 16 16"><rect x="3" y="7.5" width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button className="titlebar-btn" onClick={toggleMaximize} aria-label="最大化">
          <svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
        <button className="titlebar-btn close" onClick={close} aria-label="关闭">
          <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

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

function FloatingNav() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <nav className="floating-nav" role="navigation" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            className={`floating-nav-item ${isActive ? "active" : ""}`}
            onClick={() => setCurrentPage(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const { currentPage, setCurrentPage, theme, navPosition, setNavPosition, fontFamily, fontWeight, bgIntensity, heatmapScheme, settings, loadApps, loadCategories, loadSettings, ensureAppColors } =
    useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-font", fontFamily);
    document.documentElement.style.setProperty("--bg-intensity", String(bgIntensity));
    document.documentElement.style.setProperty("--font-weight", String(fontWeight));
  }, [theme, fontFamily, bgIntensity, fontWeight]);

  // Apply time-aware accent colors and refresh every 5 minutes
  useEffect(() => {
    applyTimeTheme();
    const id = setInterval(applyTimeTheme, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Apply background intensity
  useEffect(() => {
    const intensity = settings.bg_intensity;
    if (intensity != null) {
      document.documentElement.style.setProperty("--bg-intensity", intensity);
    }
  }, [settings.bg_intensity]);

  // Apply heatmap scheme
  useEffect(() => {
    applyHeatmapScheme(heatmapScheme);
  }, [heatmapScheme]);

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

  // Sync nav_position from settings to store
  useEffect(() => {
    const pos = settings.nav_position;
    if (pos === "left" || pos === "bottom") {
      setNavPosition(pos);
    }
  }, [settings.nav_position, setNavPosition]);

  // Assign colors to apps that don't have one (one-time)
  useEffect(() => {
    ensureAppColors();
  }, []);

  const PageComponent = PAGE_COMPONENTS[currentPage];
  const isBottomNav = navPosition === "bottom";

  return (
    <>
      <TitleBar />
      <div className="bg-layer">
        <div className="bg-aurora" />
        <div className="bg-noise" />
        <div className="bg-image" style={{ backgroundImage: settings.bg_image ? `url(${settings.bg_image})` : 'none' }} />
      </div>
      <div className={`app-layout ${isBottomNav ? "bottom-nav-layout" : ""}`}>
        {!isBottomNav && (
          <nav className="sidebar" role="navigation" aria-label="主导航">
            <div className="sidebar-logo">
              <svg viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="sbg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="55%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-soft)" />
                  </linearGradient>
                  <radialGradient id="sshine" cx="30%" cy="25%" r="70%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="url(#sbg)" />
                <circle cx="50" cy="50" r="44" fill="url(#sshine)" />
                <circle cx="50" cy="50" r="33" fill="none" stroke="white" strokeOpacity="0.95" strokeWidth="4" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1.2" />
                <line x1="50" y1="50" x2="50" y2="28" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="50" y1="50" x2="68" y2="50" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="50" cy="50" r="4" fill="white" />
                <circle cx="50" cy="50" r="43" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1.5" />
              </svg>
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
            <div className="sidebar-footer">
              <button className="nav-item" onClick={exportScreenshot} aria-label="导出截图">
                <Download />
                导出截图
              </button>
            </div>
          </nav>
        )}
        <main className={`main-content ${isBottomNav ? "has-bottom-nav" : ""}`}>
          <PageComponent />
        </main>
        {isBottomNav && <FloatingNav />}
      </div>
    </>
  );
}

export default App;
