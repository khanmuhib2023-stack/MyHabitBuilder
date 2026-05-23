/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseYmdLocal(ymd: string): Date {
  const parts = ymd.split("-").map((x) => Number(x));
  if (parts.length !== 3) return new Date(NaN);
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00:00 local for the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0 Sun … 6 Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type WeekDayInfo = {
  ymd: string;
  label: string;
};

/** Seven entries, Monday → Sunday, local dates. */
export function getWeekDaysContaining(anchor: Date): WeekDayInfo[] {
  const start = startOfWeekMonday(anchor);
  const out: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const ymd = toYmd(day);
    const month = day.getMonth() + 1;
    const dateNum = day.getDate();
    out.push({
      ymd,
      label: `${weekdayShort[i]} ${month}/${dateNum}`,
    });
  }
  return out;
}
