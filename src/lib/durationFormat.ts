/** Format decimal hours as "1h 30m" (or "45m", "2h"). */
export function formatDurationHours(hoursDecimal: number): string {
  if (!Number.isFinite(hoursDecimal)) return "—";
  const totalMin = Math.round(hoursDecimal * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0 && m === 0) return "0m";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHoursMinutes(hours: number, minutes: number): string {
  return formatDurationHours(hours + minutes / 60);
}

export function durationToDecimalHours(hours: number, minutes: number): number {
  return Math.max(0, hours) + Math.max(0, minutes) / 60;
}
