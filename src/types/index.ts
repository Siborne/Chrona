// Database types matching Rust schema

export interface App {
  id: number;
  exe_path: string;
  name: string;
  category_id: number | null;
  color: string;
}

export interface Category {
  id: number;
  name: string;
  color: string | null;
}

export interface Session {
  id: number;
  app_id: number;
  title: string | null;
  started_at: number; // Unix timestamp ms
  ended_at: number | null; // null = currently active
  duration: number | null; // ms
}

export interface Setting {
  key: string;
  value: string;
}

// Extended types for UI
export interface SessionWithDuration extends Session {
  app_name: string;
  app_color: string;
  category_name: string | null;
}

export interface AppUsageStats {
  app_id: number;
  app_name: string;
  app_color: string;
  total_duration: number; // ms
  session_count: number;
}

export interface HourlyDistribution {
  hour: number;
  duration: number; // ms
}

export interface DailyStats {
  date: string;
  total_duration: number;
  app_breakdown: AppUsageStats[];
}

export interface HeatmapData {
  date: string;
  duration: number; // ms
  level: number; // 0-4 for heatmap intensity
}

export interface TrendData {
  date: string;
  app_name: string;
  duration: number;
}

// Default settings
export const DEFAULT_SETTINGS: Record<string, string> = {
  merge_interval: "30",
  theme: "light",
  language: "zh",
  auto_start: "true",
};

export type Theme = "light" | "dark";
export type Language = "zh" | "en";
export type PageId = "overview" | "activity" | "stats" | "settings";
