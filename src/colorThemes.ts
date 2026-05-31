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
  g1: string; // gradient start
  g2: string; // gradient end
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "lavender",    name: "薰衣草紫",  g1: "#B4A0FF", g2: "#E8A0FF" },
  { id: "rose",        name: "玫瑰粉",    g1: "#FF6B8A", g2: "#FF9A9E" },
  { id: "sunset",      name: "日落橙",    g1: "#FF8C42", g2: "#FFB347" },
  { id: "emerald",     name: "翡翠绿",    g1: "#36D1A0", g2: "#5BE5A0" },
  { id: "ocean",       name: "海洋青",    g1: "#36D1DC", g2: "#48CAE4" },
  { id: "amber",       name: "琥珀金",    g1: "#D4A574", g2: "#E8C896" },
  { id: "coral",       name: "珊瑚红",    g1: "#FF6B6B", g2: "#FFB347" },
  { id: "mauve",       name: "暮紫",      g1: "#C080F0", g2: "#E0A0D0" },
];

// ── Derived theme values ──────────────────────────────────
export interface ThemeVars {
  accent: string;
  accentHover: string;
  accentLight: string;
  accentGlow: string;
  gradientStart: string;
  gradientEnd: string;
  heatmap: [string, string, string, string]; // level 1-4
  darkAccent: string;
  darkAccentHover: string;
  darkAccentLight: string;
  darkAccentGlow: string;
  darkHeatmap: [string, string, string, string];
}

export function deriveTheme(g1: string, g2: string): ThemeVars {
  const accent = g1;
  const accentHover = darken(g1, 0.15);

  return {
    accent,
    accentHover,
    accentLight: rgba(g1, 0.10),
    accentGlow: rgba(g1, 0.15),
    gradientStart: g1,
    gradientEnd: g2,
    heatmap: [
      rgba(g1, 0.15),
      rgba(g1, 0.35),
      rgba(g1, 0.60),
      g1,
    ],
    darkAccent: lighten(g1, 0.15),
    darkAccentHover: g1,
    darkAccentLight: rgba(lighten(g1, 0.15), 0.12),
    darkAccentGlow: rgba(lighten(g1, 0.15), 0.18),
    darkHeatmap: [
      rgba(lighten(g1, 0.15), 0.12),
      rgba(lighten(g1, 0.15), 0.28),
      rgba(lighten(g1, 0.15), 0.50),
      lighten(g1, 0.15),
    ],
  };
}

// ── Apply theme to document ───────────────────────────────
export function applyColorTheme(g1: string, g2: string) {
  const t = deriveTheme(g1, g2);
  const root = document.documentElement;

  // Light mode
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-hover", t.accentHover);
  root.style.setProperty("--accent-light", t.accentLight);
  root.style.setProperty("--accent-glow", t.accentGlow);
  root.style.setProperty("--gradient-start", t.gradientStart);
  root.style.setProperty("--gradient-end", t.gradientEnd);

  // Dark mode is applied via [data-theme="dark"] — we use a style tag
  let tag = document.getElementById("dynamic-dark-theme") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "dynamic-dark-theme";
    document.head.appendChild(tag);
  }
  tag.textContent = `
    [data-theme="dark"] {
      --accent: ${t.darkAccent};
      --accent-hover: ${t.darkAccentHover};
      --accent-light: ${t.darkAccentLight};
      --accent-glow: ${t.darkAccentGlow};
    }
    .heatmap-cell.level-1 { background-color: ${t.heatmap[0]}; }
    .heatmap-cell.level-2 { background-color: ${t.heatmap[1]}; }
    .heatmap-cell.level-3 { background-color: ${t.heatmap[2]}; }
    .heatmap-cell.level-4 { background-color: ${t.heatmap[3]}; }
    [data-theme="dark"] .heatmap-cell.level-1 { background-color: ${t.darkHeatmap[0]}; }
    [data-theme="dark"] .heatmap-cell.level-2 { background-color: ${t.darkHeatmap[1]}; }
    [data-theme="dark"] .heatmap-cell.level-3 { background-color: ${t.darkHeatmap[2]}; }
    [data-theme="dark"] .heatmap-cell.level-4 { background-color: ${t.darkHeatmap[3]}; }
  `;
}

// ── Generate gradient from single accent color ────────────
// Shift hue toward purple, lighten → gradient end
export function accentToGradient(accent: string): [string, string] {
  const [r, g, b] = hexToRgb(accent);
  // Mix toward lavender purple (#C8A0FF) by 30%
  const g2 = rgbToHex(
    r * 0.7 + 200 * 0.3,
    g * 0.7 + 160 * 0.3,
    b * 0.5 + 255 * 0.5,
  );
  return [accent, lighten(g2, 0.15)];
}
