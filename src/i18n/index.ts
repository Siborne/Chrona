import { zh } from "./zh";
import { en } from "./en";
import { useAppStore } from "../store";

const translations = { zh, en } as const;

export function t(key: keyof typeof zh): string {
  const lang = useAppStore.getState().language;
  const val = translations[lang]?.[key] ?? translations.zh[key];
  return Array.isArray(val) ? val.join(",") : String(val ?? key);
}
