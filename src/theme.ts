export type TimePeriod = "dawn" | "morning" | "afternoon" | "evening" | "night" | "late";

export interface TimeTheme {
  period: TimePeriod;
  label: string;
  emoji: string;
  gradient: [string, string, string];
}

const TIME_THEMES: Record<TimePeriod, TimeTheme> = {
  dawn:      { period: "dawn",      label: "凌晨好", emoji: "\u{1F305}", gradient: ["#818CF8", "#A5B4FC", "#C7D2FE"] },
  morning:   { period: "morning",   label: "早上好", emoji: "☀️",       gradient: ["#6366F1", "#818CF8", "#A5B4FC"] },
  afternoon: { period: "afternoon", label: "下午好", emoji: "\u{1F31E}",  gradient: ["#4F46E5", "#6366F1", "#818CF8"] },
  evening:   { period: "evening",   label: "晚上好", emoji: "\u{1F306}", gradient: ["#4338CA", "#4F46E5", "#6366F1"] },
  night:     { period: "night",     label: "夜深了", emoji: "\u{1F319}", gradient: ["#3730A3", "#4338CA", "#4F46E5"] },
  late:      { period: "late",      label: "夜深了", emoji: "⭐",      gradient: ["#312E81", "#3730A3", "#4338CA"] },
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
