export const MS_PER_HOUR = 3600000;
export const MS_PER_DAY = 86400000;

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / MS_PER_HOUR);
  const m = Math.floor((ms % MS_PER_HOUR) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDurationPrecise(ms: number): string {
  const h = Math.floor(ms / MS_PER_HOUR);
  const m = Math.floor((ms % MS_PER_HOUR) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
