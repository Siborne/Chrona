import { create } from "zustand";
import type { App, Category, Session, Theme, Language, PageId } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface AppState {
  currentPage: PageId;
  selectedDate: Date;
  theme: Theme;
  language: Language;
  apps: App[];
  categories: Category[];
  sessions: Session[];
  settings: Record<string, string>;
  setCurrentPage: (page: PageId) => void;
  setSelectedDate: (date: Date) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  loadApps: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadSessions: (date: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSetting: (key: string, value: string) => Promise<void>;
  updateApp: (id: number, updates: Partial<App>) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  updateCategory: (id: number, name: string, color: string) => Promise<void>;
  deleteApp: (id: number) => Promise<void>;
  ensureAppColors: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: "overview",
  selectedDate: new Date(),
  theme: (localStorage.getItem("theme") as Theme) || "light",
  language: (localStorage.getItem("language") as Language) || "zh",
  apps: [],
  categories: [],
  sessions: [],
  settings: {},

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  setLanguage: (language) => {
    localStorage.setItem("language", language);
    set({ language });
  },

  loadApps: async () => {
    try {
      const apps = await invoke<App[]>("get_apps");
      set({ apps });
    } catch (e) {
      console.error("Failed to load apps:", e);
    }
  },

  loadCategories: async () => {
    try {
      const categories = await invoke<Category[]>("get_categories");
      set({ categories });
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  },

  loadSessions: async (date: string) => {
    try {
      const sessions = await invoke<Session[]>("get_sessions_by_date", { date });
      set({ sessions });
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<Record<string, string>>("get_all_settings");
      set({ settings });
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  },

  saveSetting: async (key: string, value: string) => {
    try {
      await invoke("save_setting", { key, value });
      set((state) => ({
        settings: { ...state.settings, [key]: value },
      }));
    } catch (e) {
      console.error("Failed to save setting:", e);
    }
  },

  updateApp: async (id, updates) => {
    try {
      await invoke("update_app", { id, ...updates });
      await get().loadApps();
    } catch (e) {
      console.error("Failed to update app:", e);
    }
  },

  createCategory: async (name, color) => {
    try {
      await invoke("create_category", { name, color });
      await get().loadCategories();
    } catch (e) {
      console.error("Failed to create category:", e);
    }
  },

  deleteCategory: async (id) => {
    try {
      await invoke("delete_category", { id });
      await get().loadCategories();
    } catch (e) {
      console.error("Failed to delete category:", e);
    }
  },

  updateCategory: async (id, name, color) => {
    try {
      await invoke("update_category", { id, name, color });
      await get().loadCategories();
    } catch (e) {
      console.error("Failed to update category:", e);
    }
  },

  deleteApp: async (id) => {
    try {
      await invoke("delete_app", { id });
      await get().loadApps();
    } catch (e) {
      console.error("Failed to delete app:", e);
    }
  },

  ensureAppColors: async () => {
    try {
      const count = await invoke<number>("ensure_app_colors");
      if (count > 0) await get().loadApps();
    } catch (e) {
      console.error("Failed to assign app colors:", e);
    }
  },
}));
