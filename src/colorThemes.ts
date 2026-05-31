// ── Color utilities ────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Preset definition ─────────────────────────────────────
export interface ColorPreset {
  id: string;
  name: string;
  g1: string; // accent
  g2: string; // accent-soft
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "indigo",    name: "靛蓝",      g1: "#6366F1", g2: "#818CF8" },
  { id: "violet",    name: "紫罗兰",    g1: "#8B5CF6", g2: "#A78BFA" },
  { id: "rose",      name: "玫瑰粉",    g1: "#F43F5E", g2: "#FB7185" },
  { id: "emerald",   name: "翡翠绿",    g1: "#10B981", g2: "#34D399" },
  { id: "cyan",      name: "海洋青",    g1: "#06B6D4", g2: "#22D3EE" },
  { id: "amber",     name: "琥珀金",    g1: "#D97706", g2: "#FBBF24" },
  { id: "coral",     name: "珊瑚红",    g1: "#EF4444", g2: "#F87171" },
  { id: "slate",     name: "岩灰",      g1: "#64748B", g2: "#94A3B8" },
];

// ── Apply theme to document ───────────────────────────────
export function applyColorTheme(g1: string, g2: string) {
  const accent = g1;
  const accentSoft = g2;
  const accentHover = darken(g1, 0.15);
  const accentDim = rgba(g1, 0.12);
  const accentDimLight = rgba(g1, 0.08);

  const root = document.documentElement;

  // Set accent variables directly on :root (dark mode default)
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-soft", accentSoft);
  root.style.setProperty("--accent-hover", accentHover);
  root.style.setProperty("--accent-dim", accentDim);

  // Also update light theme accent variables
  let tag = document.getElementById("dynamic-accent-theme") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "dynamic-accent-theme";
    document.head.appendChild(tag);
  }
  tag.textContent = `
    [data-theme="light"] {
      --accent: ${accent};
      --accent-soft: ${accentSoft};
      --accent-hover: ${darken(g1, 0.2)};
      --accent-dim: ${accentDimLight};
    }
    .heatmap-cell.level-1 { background-color: ${rgba(g1, 0.15)}; }
    .heatmap-cell.level-2 { background-color: ${rgba(g1, 0.35)}; }
    .heatmap-cell.level-3 { background-color: ${rgba(g1, 0.60)}; }
    .heatmap-cell.level-4 { background-color: ${g1}; }
    .bg-layer {
      background:
        radial-gradient(ellipse 80% 60% at 15% 10%, ${rgba(g1, 0.07)} 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 85% 85%, ${rgba(g2, 0.04)} 0%, transparent 50%),
        linear-gradient(160deg, #0C0E14 0%, #07080A 40%, #090A10 70%, #0D0E16 100%);
    }
  `;
}

// ── Generate gradient from single accent color ────────────
// Shift hue toward purple, lighten → gradient end
export function accentToGradient(accent: string): [string, string] {
  const [r, g, b] = hexToRgb(accent);
  const g2 = rgbToHex(
    r * 0.7 + 200 * 0.3,
    g * 0.7 + 160 * 0.3,
    b * 0.5 + 255 * 0.5,
  );
  return [accent, lighten(g2, 0.15)];
}

// ── Get chart colors from current theme accent ────────────
export function getChartColors(): string[] {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const accent = style.getPropertyValue("--accent").trim() || "#6366F1";
  const accentSoft = style.getPropertyValue("--accent-soft").trim() || "#818CF8";

  return [
    accent,
    accentSoft,
    darken(accent, 0.15),
    lighten(accentSoft, 0.12),
    darken(accent, 0.3),
    darken(accent, 0.45),
    lighten(accentSoft, 0.24),
    darken(accent, 0.55),
  ];
}
