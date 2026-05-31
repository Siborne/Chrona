export type TimePeriod = "dawn" | "morning" | "afternoon" | "evening" | "night" | "late";

export interface TimeTheme {
  period: TimePeriod;
  label: string;
  emoji: string;
  gradient: [string, string, string];
}

const TIME_THEMES: Record<TimePeriod, TimeTheme> = {
  dawn:     { period: "dawn",     label: "凌晨好", emoji: "\u{1F305}", gradient: ["#C8A0FF", "#D0A8F0", "#E0A0F0"] },
  morning:  { period: "morning",  label: "早上好", emoji: "☀️", gradient: ["#B8A8FF", "#C8B0F8", "#E0B0F0"] },
  afternoon:{ period: "afternoon",label: "下午好", emoji: "\u{1F31E}",  gradient: ["#B4A0FF", "#C8A0F8", "#E8A0FF"] },
  evening:  { period: "evening",  label: "晚上好", emoji: "\u{1F306}", gradient: ["#A8A0F0", "#B8A0E8", "#D8A0F0"] },
  night:    { period: "night",    label: "夜深了", emoji: "\u{1F319}", gradient: ["#A0A0E8", "#B0A0E0", "#D0A0F0"] },
  late:     { period: "late",     label: "夜深了", emoji: "⭐",     gradient: ["#98A0E0", "#A8A0D8", "#C8A0E8"] },
};

export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5  && hour < 7)  return "dawn";
  if (hour >= 7  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 23) return "night";
  return "late";
}

export function getTimeTheme(): TimeTheme {
  return TIME_THEMES[getTimePeriod(new Date().getHours())];
}

export function applyTimeTheme() {
  const theme = getTimeTheme();
  document.documentElement.setAttribute("data-time-period", theme.period);
}

export function formatTimeHM(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}
