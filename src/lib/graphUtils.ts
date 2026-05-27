import type { HabitDefinition } from "@/lib/flexHabitTypes";
import {
  getValueForHabit,
  hasStoredValueForHabit,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import {
  calculateChartTrend,
  calculateGoalMetRate,
  getDailyTargetScalar,
  getMonthlyChartTargetScalar,
  getWeeklyChartTargetScalar,
  goalDifferenceText,
  trendDirectionLabel,
} from "@/lib/targetUtils";
import { resolveDailyActual } from "@/lib/defaultValueUtils";
import { parseYmdLocal, startOfWeekMonday, toYmd } from "@/lib/weekRange";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type GraphTab = "last7" | "monthly";

export type DailySeriesPoint = {
  ymd: string;
  label: string;
  actual: number | null;
  /** True when value comes from preset default, not a manual log. */
  assumed?: boolean;
  target: number | null;
  trend: number | null;
  gapBase: number | null;
  gapSize: number | null;
};

export type MonthlySeriesPoint = {
  key: string;
  label: string;
  month: number;
  actual: number | null;
  target: number | null;
  trend: number | null;
  gapBase: number | null;
  gapSize: number | null;
};

/** @deprecated weekly charts removed from UI */
export type WeeklySeriesPoint = {
  key: string;
  label: string;
  monthTick: string;
  weekOfMonth: number;
  actual: number | null;
  target: number | null;
  trend: number | null;
  gapBase: number | null;
  gapSize: number | null;
};

/** @deprecated use DailySeriesPoint */
export type DailyChartPoint = DailySeriesPoint;
/** @deprecated use MonthlySeriesPoint */
export type WeeklyChartPoint = WeeklySeriesPoint;

export type SummaryRow = { label: string; value: string };

export function isWeightHabit(habit: HabitDefinition): boolean {
  return (
    habit.type === "number" && habit.name.trim().toLowerCase() === "weight"
  );
}

export function isBadOccurrenceHabit(habit: HabitDefinition): boolean {
  return (
    habit.scoringKey === "rule1" ||
    habit.scoringKey === "bad_occurrence" ||
    (habit.category === "islam" &&
      habit.name.trim().toLowerCase().includes("rule"))
  );
}

export function isStreakCheckboxHabit(habit: HabitDefinition): boolean {
  return habit.type === "checkbox";
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const d = parseYmdLocal(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + delta);
  return toYmd(d);
}

/** Local calendar date at midnight (for graph window anchors). */
export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Seven days ending on `endDate` (inclusive), oldest → newest. */
export function getLast7Days(
  endDate: Date = new Date()
): { ymd: string; label: string }[] {
  const base = startOfLocalDay(endDate);
  const out: { ymd: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const ymd = toYmd(d);
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    out.push({
      ymd,
      label: `${wd} ${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return out;
}

/** The 7-day window immediately before the window ending on `endDate`. */
export function getPrevious7Days(
  endDate: Date = new Date()
): { ymd: string; label: string }[] {
  const shifted = startOfLocalDay(endDate);
  shifted.setDate(shifted.getDate() - 7);
  return getLast7Days(shifted);
}

export function formatLast7PeriodLabel(endDate: Date): string {
  const days = getLast7Days(endDate);
  const start = parseYmdLocal(days[0].ymd);
  const end = parseYmdLocal(days[days.length - 1].ymd);
  return formatWeekRangeLabel(start, end);
}

export function getLast7GraphSubtitle(endDate: Date): string {
  return `Last 7 days · ${formatLast7PeriodLabel(endDate)}`;
}

export function getMonthlyGraphSubtitle(year: number): string {
  return `Monthly view · ${year}`;
}

export function canAdvanceLast7Window(windowEndDate: Date): boolean {
  return toYmd(startOfLocalDay(windowEndDate)) < toYmd(new Date());
}

export function isLast7WindowAtToday(windowEndDate: Date): boolean {
  return toYmd(startOfLocalDay(windowEndDate)) === toYmd(new Date());
}

export function shiftLast7WindowEnd(
  windowEndDate: Date,
  weeksDelta: number
): Date {
  const d = startOfLocalDay(windowEndDate);
  d.setDate(d.getDate() + weeksDelta * 7);
  return clampLast7WindowEnd(d);
}

export function clampLast7WindowEnd(endDate: Date): Date {
  const today = startOfLocalDay();
  const d = startOfLocalDay(endDate);
  return d.getTime() > today.getTime() ? today : d;
}

export function formatWeekRangeLabel(start: Date, end: Date): string {
  const sm = MONTHS[start.getMonth()];
  const em = MONTHS[end.getMonth()];
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${sm} ${start.getDate()}–${end.getDate()}`;
  }
  if (sy === ey) {
    return `${sm} ${start.getDate()} – ${em} ${end.getDate()}`;
  }
  return `${sm} ${start.getDate()}, ${sy} – ${em} ${end.getDate()}, ${ey}`;
}

export type WeekBucket = {
  key: string;
  ymdStart: string;
  ymdEnd: string;
  label: string;
  /** Monday 00:00 local (copy) */
  startDate: Date;
  /** Sunday (end of week) */
  endDate: Date;
  /** Primary calendar month 0–11 (majority of days in the week; Thursday tiebreaker). */
  month: number;
  /** 1-based index of this week within consecutive weeks sharing the same primary month. */
  weekOfMonth: number;
  /** Calendar year of the primary month used for labeling. */
  year: number;
};

function addDaysLocal(d: Date, delta: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Majority (year, month) across Mon–Sun; ties broken by Thursday’s month. */
export function getPrimaryMonthMeta(weekStartMonday: Date): {
  year: number;
  month: number;
} {
  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = addDaysLocal(weekStartMonday, i);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let bestK = "";
  let bestC = -1;
  for (const [k, c] of counts) {
    if (c > bestC) {
      bestC = c;
      bestK = k;
    }
  }
  const top = [...counts.entries()].filter(([, c]) => c === bestC);
  if (top.length > 1) {
    const thu = addDaysLocal(weekStartMonday, 3);
    const tk = `${thu.getFullYear()}-${thu.getMonth()}`;
    if (counts.has(tk)) bestK = tk;
  }
  const [y, m] = bestK.split("-").map(Number);
  return { year: y, month: m };
}

/**
 * All Monday-start weeks from the week containing Jan 1 through the week containing Dec 31.
 * Labels: Week Jan-01, Week Jan-02, … by consecutive primary-month groups (majority month).
 */
export function getWeeksForYear(year: number): WeekBucket[] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const firstMon = startOfWeekMonday(jan1);
  const lastMon = startOfWeekMonday(dec31);
  const starts: Date[] = [];
  const cur = new Date(firstMon);
  let guard = 0;
  while (cur.getTime() <= lastMon.getTime() && guard++ < 60) {
    starts.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  let lastPrimaryKey = "";
  let weekInPrimaryBlock = 0;
  return starts.map((start) => {
    const end = addDaysLocal(start, 6);
    const ymdStart = toYmd(start);
    const ymdEnd = toYmd(end);
    const { year: py, month: pm } = getPrimaryMonthMeta(start);
    const pk = `${py}-${pm}`;
    if (pk !== lastPrimaryKey) {
      lastPrimaryKey = pk;
      weekInPrimaryBlock = 0;
    }
    weekInPrimaryBlock++;
    const label = `Week ${MONTHS[pm]}-${String(weekInPrimaryBlock).padStart(2, "0")}`;
    return {
      key: `${ymdStart}_${ymdEnd}`,
      ymdStart,
      ymdEnd,
      label,
      startDate: new Date(start),
      endDate: new Date(end),
      month: pm,
      weekOfMonth: weekInPrimaryBlock,
      year: py,
    };
  });
}

/** @deprecated Prefer getWeeksForYear for charts; kept for narrow rolling windows if needed. */
export type MonthBucket = {
  key: string;
  label: string;
  month: number;
  year: number;
  ymdStart: string;
  ymdEnd: string;
  startDate: Date;
  endDate: Date;
  daysInMonth: number;
};

/** Twelve calendar months for a year (Jan–Dec). */
export function getMonthsForYear(year: number): MonthBucket[] {
  return MONTHS.map((label, month) => {
    const startDate = new Date(year, month, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(0, 0, 0, 0);
    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label,
      month,
      year,
      ymdStart: toYmd(startDate),
      ymdEnd: toYmd(endDate),
      startDate,
      endDate,
      daysInMonth: endDate.getDate(),
    };
  });
}

export function getWeeklyBuckets(
  anchor: Date = new Date(),
  count: number = 8
): WeekBucket[] {
  const anchorMonday = startOfWeekMonday(anchor);
  const buckets: WeekBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(anchorMonday);
    start.setDate(anchorMonday.getDate() - i * 7);
    const end = addDaysLocal(start, 6);
    const ymdStart = toYmd(start);
    const ymdEnd = toYmd(end);
    const { year: py, month: pm } = getPrimaryMonthMeta(start);
    const label = formatWeekRangeLabel(start, end);
    buckets.push({
      key: `${ymdStart}_${ymdEnd}`,
      ymdStart,
      ymdEnd,
      label,
      startDate: new Date(start),
      endDate: new Date(end),
      month: pm,
      weekOfMonth: 0,
      year: py,
    });
  }
  return buckets;
}

export function eachYmdInclusive(ymdStart: string, ymdEnd: string): string[] {
  const out: string[] = [];
  let cur = ymdStart;
  let guard = 0;
  while (cur <= ymdEnd && guard++ < 400) {
    out.push(cur);
    if (cur === ymdEnd) break;
    cur = addDaysToYmd(cur, 1);
  }
  return out;
}

export type HabitLogEntry = {
  ymd: string;
  value: number;
  hasStored: boolean;
};

export function getHabitLogsForRange(
  habit: HabitDefinition,
  values: ValuesByDate,
  ymdStart: string,
  ymdEnd: string
): HabitLogEntry[] {
  return eachYmdInclusive(ymdStart, ymdEnd).map((ymd) => {
    const hasStored = hasStoredValueForHabit(values, ymd, habit.id);
    const raw = getValueForHabit(values, ymd, habit);
    let value = 0;
    if (raw.type === "number") value = raw.value;
    else if (raw.type === "checkbox") value = raw.checked ? 1 : 0;
    else if (raw.type === "duration")
      value = raw.hours + raw.minutes / 60;
    return { ymd, value, hasStored };
  });
}

export function dailyActualValue(
  habit: HabitDefinition,
  values: ValuesByDate,
  ymd: string
): number | null {
  return resolveDailyActual(habit, values, ymd).value;
}

export function buildDailySeries(
  habit: HabitDefinition,
  values: ValuesByDate,
  days: { ymd: string; label: string }[]
): DailySeriesPoint[] {
  const resolved = days.map(({ ymd }) =>
    resolveDailyActual(habit, values, ymd)
  );
  const actuals = resolved.map((r) => r.value);
  const trends = calculateChartTrend(habit, actuals);
  const dt = habit.target ? getDailyTargetScalar(habit) : null;
  return days.map((d, i) => {
    const actual = actuals[i];
    const assumed = resolved[i].assumed;
    const target = dt != null ? dt : null;
    const trend = trends[i];
    let gapBase: number | null = null;
    let gapSize: number | null = null;
    if (actual != null && target != null) {
      gapBase = Math.min(actual, target);
      gapSize = Math.abs(actual - target);
    }
    return {
      ymd: d.ymd,
      label: d.label,
      actual,
      assumed: assumed || undefined,
      target,
      trend,
      gapBase,
      gapSize,
    };
  });
}

/** Back-compat: same as buildDailySeries mapped to legacy `value` field name. */
export function getDailyHabitValues(
  habit: HabitDefinition,
  values: ValuesByDate,
  days: { ymd: string; label: string }[]
): DailyChartPoint[] {
  return buildDailySeries(habit, values, days);
}

function aggregateWeek(
  habit: HabitDefinition,
  values: ValuesByDate,
  bucket: WeekBucket
): number | null {
  const days = eachYmdInclusive(bucket.ymdStart, bucket.ymdEnd);

  if (habit.type === "checkbox") {
    let done = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "checkbox" && v.checked) done++;
    }
    return done;
  }

  if (isBadOccurrenceHabit(habit)) {
    let sum = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "number") sum += v.value;
    }
    return sum;
  }

  if (habit.type === "duration") {
    let hours = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "duration")
        hours += v.hours + v.minutes / 60;
    }
    return hours / 7;
  }

  if (habit.type === "number") {
    if (isWeightHabit(habit)) {
      let sum = 0;
      let n = 0;
      for (const ymd of days) {
        if (!hasStoredValueForHabit(values, ymd, habit.id)) continue;
        const v = getValueForHabit(values, ymd, habit);
        if (v.type === "number") {
          sum += v.value;
          n++;
        }
      }
      return n === 0 ? null : sum / n;
    }
    let sum = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "number") sum += v.value;
    }
    return sum / 7;
  }

  return null;
}

export function buildWeeklySeries(
  habit: HabitDefinition,
  values: ValuesByDate,
  buckets: WeekBucket[]
): WeeklySeriesPoint[] {
  const actuals = buckets.map((b) => aggregateWeek(habit, values, b));
  const trends = calculateChartTrend(habit, actuals);
  const wt =
    habit.target != null ? getWeeklyChartTargetScalar(habit) : null;
  return buckets.map((b, i) => {
    const actual = actuals[i];
    const target = wt != null ? wt : null;
    const trend = trends[i];
    let gapBase: number | null = null;
    let gapSize: number | null = null;
    if (actual != null && target != null) {
      gapBase = Math.min(actual, target);
      gapSize = Math.abs(actual - target);
    }
    return {
      key: b.key,
      label: b.label,
      monthTick: b.weekOfMonth === 1 ? MONTHS[b.month] : "",
      weekOfMonth: b.weekOfMonth,
      actual,
      target,
      trend,
      gapBase,
      gapSize,
    };
  });
}

export function getWeeklyHabitValues(
  habit: HabitDefinition,
  values: ValuesByDate,
  buckets: WeekBucket[]
): WeeklyChartPoint[] {
  return buildWeeklySeries(habit, values, buckets);
}

function aggregateMonth(
  habit: HabitDefinition,
  values: ValuesByDate,
  bucket: MonthBucket
): number | null {
  const days = eachYmdInclusive(bucket.ymdStart, bucket.ymdEnd);

  if (habit.type === "checkbox") {
    let done = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "checkbox" && v.checked) done++;
    }
    return done;
  }

  if (isBadOccurrenceHabit(habit)) {
    let sum = 0;
    for (const ymd of days) {
      const v = getValueForHabit(values, ymd, habit);
      if (v.type === "number") sum += v.value;
    }
    return sum;
  }

  if (habit.type === "number" || habit.type === "duration") {
    let sum = 0;
    let n = 0;
    for (const ymd of days) {
      const { value } = resolveDailyActual(habit, values, ymd);
      if (value == null) continue;
      sum += value;
      n++;
    }
    return n === 0 ? null : sum / n;
  }

  return null;
}

export function buildMonthlySeries(
  habit: HabitDefinition,
  values: ValuesByDate,
  buckets: MonthBucket[]
): MonthlySeriesPoint[] {
  const actuals = buckets.map((b) => aggregateMonth(habit, values, b));
  const trends = calculateChartTrend(habit, actuals);
  return buckets.map((b, i) => {
    const actual = actuals[i];
    const target =
      habit.target != null
        ? getMonthlyChartTargetScalar(habit, b)
        : null;
    const trend = trends[i];
    let gapBase: number | null = null;
    let gapSize: number | null = null;
    if (actual != null && target != null) {
      gapBase = Math.min(actual, target);
      gapSize = Math.abs(actual - target);
    }
    return {
      key: b.key,
      label: b.label,
      month: b.month,
      actual,
      target,
      trend,
      gapBase,
      gapSize,
    };
  });
}

export function calculateAverage(values: (number | null)[]): number | null {
  const nums = values.filter((x): x is number => x != null && !Number.isNaN(x));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function calculateTotal(values: (number | null)[]): number | null {
  const nums = values.filter((x): x is number => x != null && !Number.isNaN(x));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
}

export function calculateTrendPercentage(
  current: number | null,
  previous: number | null
): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function calculateCurrentStreak(
  values: ValuesByDate,
  habit: HabitDefinition,
  endYmd: string
): number {
  if (!isStreakCheckboxHabit(habit)) return 0;
  let streak = 0;
  let d = endYmd;
  for (let i = 0; i < 365 * 3; i++) {
    const v = getValueForHabit(values, d, habit);
    if (v.type === "checkbox" && v.checked) {
      streak++;
      d = addDaysToYmd(d, -1);
    } else break;
  }
  return streak;
}

export function calculateAvoidedDaysForBadHabit(
  dailyOccurrences: number[]
): number {
  return dailyOccurrences.filter((x) => x === 0).length;
}

export function formatTrendLine(pct: number | null): string | null {
  if (pct == null) return null;
  const rounded = Math.round(pct);
  if (rounded === 0) return "Flat vs prior period";
  const magnitude = `${Math.abs(rounded)}%`;
  if (rounded > 0) return `Up ${magnitude} vs prior period`;
  return `Down ${magnitude} vs prior period`;
}

function formatNumber(n: number, maxFrac = 1): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  });
}

export function buildLast7Summary(
  habit: HabitDefinition,
  values: ValuesByDate,
  windowEndDate: Date
): SummaryRow[] {
  const last7 = getLast7Days(windowEndDate);
  const prev7 = getPrevious7Days(windowEndDate);
  const pts = buildDailySeries(habit, values, last7);
  const prevPts = buildDailySeries(habit, values, prev7);
  const nums = pts.map((p) => p.actual);
  const prevNums = prevPts.map((p) => p.actual);

  const rows: SummaryRow[] = [];
  const tgt = habit.target ? getDailyTargetScalar(habit) : null;

  if (habit.type === "checkbox") {
    const completed = nums.filter((v) => v === 1).length;
    rows.push({ label: "Completed", value: `${completed}/7 days` });
    if (tgt != null) {
      rows.push({
        label: "Goal",
        value: `${tgt.toLocaleString()} / day`,
      });
    }
    if (isStreakCheckboxHabit(habit)) {
      const endY = last7[last7.length - 1]?.ymd ?? toYmd(windowEndDate);
      rows.push({
        label: "Current streak",
        value: `${calculateCurrentStreak(values, habit, endY)} days`,
      });
    }
    const prevCompleted = prevNums.filter((v) => v === 1).length;
    const trend = calculateTrendPercentage(completed, prevCompleted);
    if (trend != null && prevCompleted > 0) {
      rows.push({
        label: "vs prior 7 days",
        value: formatTrendLine(trend) ?? "—",
      });
    }
    const rate = calculateGoalMetRate(
      habit,
      values,
      last7.map((d) => d.ymd)
    );
    if (rate != null && habit.target) {
      rows.push({
        label: "Goal met",
        value: `${Math.round(rate)}% of days`,
      });
    }
    const td = trendDirectionLabel(habit, nums);
    if (td) rows.push({ label: "Direction", value: td });
    return rows;
  }

  if (isBadOccurrenceHabit(habit)) {
    const occ = nums.map((v) => (v == null ? 0 : v));
    const total = occ.reduce((a, b) => a + b, 0);
    const avoided = calculateAvoidedDaysForBadHabit(occ);
    rows.push({ label: "Occurrences (7 days)", value: String(total) });
    rows.push({ label: "Avoided days", value: `${avoided}/7` });
    if (tgt != null) {
      rows.push({ label: "Goal", value: `${tgt} / day` });
    }
    const prevOcc = prevNums.map((v) => (v == null ? 0 : v));
    const prevTotal = prevOcc.reduce((a, b) => a + b, 0);
    const t = calculateTrendPercentage(total, prevTotal);
    if (t != null && (prevTotal > 0 || total > 0)) {
      rows.push({
        label: "vs prior 7 days",
        value:
          formatTrendLine(t) ??
          (total === prevTotal ? "Flat vs prior period" : "—"),
      });
    }
    const rate = calculateGoalMetRate(
      habit,
      values,
      last7.map((d) => d.ymd)
    );
    if (rate != null && habit.target) {
      rows.push({
        label: "Goal met",
        value: `${Math.round(rate)}% of days`,
      });
    }
    const td = trendDirectionLabel(
      habit,
      nums.map((v) => (v == null ? 0 : v))
    );
    if (td) rows.push({ label: "Direction", value: td });
    return rows;
  }

  if (habit.type === "duration") {
    const avg = calculateAverage(nums);
    const total = calculateTotal(nums);
    if (avg != null)
      rows.push({
        label: "7-day average",
        value: `${formatNumber(avg, 2)} h/day`,
      });
    if (total != null)
      rows.push({
        label: "Total (7 days)",
        value: `${formatNumber(total, 2)} h`,
      });
    if (tgt != null) {
      rows.push({
        label: "Goal",
        value: `${formatNumber(tgt, 2)} h/day`,
      });
      const g = goalDifferenceText(habit, avg, tgt);
      if (g) rows.push({ label: "vs goal", value: g });
    }
    const best = Math.max(...nums.map((v) => v ?? 0));
    if (best > 0)
      rows.push({ label: "Best day", value: `${formatNumber(best, 2)} h` });
    const prevAvg = calculateAverage(prevNums);
    const tr = calculateTrendPercentage(avg, prevAvg);
    if (tr != null && prevAvg != null && prevAvg > 0) {
      rows.push({
        label: "Average trend",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    const rate = calculateGoalMetRate(
      habit,
      values,
      last7.map((d) => d.ymd)
    );
    if (rate != null && habit.target) {
      rows.push({
        label: "Goal met",
        value: `${Math.round(rate)}% of days`,
      });
    }
    const td = trendDirectionLabel(habit, nums);
    if (td) rows.push({ label: "Direction", value: td });
    if (pts.some((p) => p.assumed)) {
      rows.push({
        label: "Note",
        value: "Includes default values for missing days",
      });
    }
    return rows;
  }

  if (habit.type === "number") {
    const avg = calculateAverage(nums);
    const total = calculateTotal(nums);
    const finite = nums.filter((v): v is number => v != null);
    if (avg != null) {
      const u = habit.unit ? ` ${habit.unit}` : "";
      rows.push({
        label: "7-day average",
        value: `${formatNumber(avg, 1)}${u}`,
      });
    }
    if (tgt != null) {
      const u = habit.target?.unit ?? habit.unit ?? "";
      rows.push({
        label: "Goal",
        value: `${formatNumber(tgt, 1)}${u ? ` ${u}` : ""} / day`,
      });
      const g = goalDifferenceText(habit, avg, tgt);
      if (g) rows.push({ label: "vs goal", value: g });
    }
    if (total != null && !isWeightHabit(habit)) {
      const u = habit.unit ? ` ${habit.unit}` : "";
      rows.push({
        label: "Total (7 days)",
        value: `${formatNumber(total, 0)}${u}`,
      });
    }
    if (finite.length > 0) {
      const best = Math.max(...finite);
      const u = habit.unit ? ` ${habit.unit}` : "";
      rows.push({ label: "Best day", value: `${formatNumber(best, 0)}${u}` });
    }
    const prevAvg = calculateAverage(prevNums);
    const tr = calculateTrendPercentage(avg, prevAvg);
    if (tr != null && prevAvg != null && prevAvg > 0) {
      rows.push({
        label: "Average trend",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    const rate = calculateGoalMetRate(
      habit,
      values,
      last7.map((d) => d.ymd)
    );
    if (rate != null && habit.target) {
      rows.push({
        label: "Goal met",
        value: `${Math.round(rate)}% of days`,
      });
    }
    const td = trendDirectionLabel(habit, nums);
    if (td) rows.push({ label: "Direction", value: td });
    if (pts.some((p) => p.assumed)) {
      rows.push({
        label: "Note",
        value: "Includes default values for missing days",
      });
    }
    return rows;
  }

  return rows;
}

function monthIndexForSummary(year: number): number {
  const now = new Date();
  if (year === now.getFullYear()) return now.getMonth();
  return 11;
}

function appendMonthGoalMetRate(
  rows: SummaryRow[],
  habit: HabitDefinition,
  values: ValuesByDate,
  bucket: MonthBucket
): void {
  if (!habit.target) return;
  const days = eachYmdInclusive(bucket.ymdStart, bucket.ymdEnd);
  const rate = calculateGoalMetRate(habit, values, days);
  if (rate != null) {
    rows.push({
      label: "Goal met",
      value: `${Math.round(rate)}% of month`,
    });
  }
}

export function buildMonthlySummary(
  habit: HabitDefinition,
  values: ValuesByDate,
  year: number
): SummaryRow[] {
  const buckets = getMonthsForYear(year);
  const pts = buildMonthlySeries(habit, values, buckets);
  const vals = pts.map((p) => p.actual);
  const finite = vals.filter((v): v is number => v != null);

  const rows: SummaryRow[] = [];
  if (finite.length === 0) return rows;

  const mi = monthIndexForSummary(year);
  const bucket = buckets[mi];
  const last = vals[mi];
  const prev = mi > 0 ? vals[mi - 1] : null;
  const u = habit.unit ? ` ${habit.unit}` : "";
  const mt =
    habit.target && bucket
      ? getMonthlyChartTargetScalar(habit, bucket)
      : null;
  const dailyTgt = habit.target ? getDailyTargetScalar(habit) : null;

  const endYmd = bucket?.ymdEnd ?? toYmd(new Date());

  if (habit.type === "checkbox") {
    const dim = bucket?.daysInMonth ?? 31;
    if (last != null)
      rows.push({
        label: "This month",
        value: `${formatNumber(last, 0)}/${dim} days`,
      });
    if (mt != null)
      rows.push({ label: "Goal (month)", value: `${formatNumber(mt, 0)}` });
    const best = Math.max(...finite);
    const low = Math.min(...finite);
    rows.push({
      label: "Best month",
      value: `${formatNumber(best, 0)} days`,
    });
    rows.push({
      label: "Lowest month",
      value: `${formatNumber(low, 0)} days`,
    });
    rows.push({
      label: "Current streak",
      value: `${calculateCurrentStreak(values, habit, endYmd)} days`,
    });
    const tr = calculateTrendPercentage(last, prev);
    if (tr != null && prev != null) {
      rows.push({
        label: "Vs previous month",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    if (bucket) appendMonthGoalMetRate(rows, habit, values, bucket);
    return rows;
  }

  if (isBadOccurrenceHabit(habit)) {
    if (last != null)
      rows.push({
        label: "This month total",
        value: String(Math.round(last)),
      });
    if (mt != null) rows.push({ label: "Goal (month)", value: String(mt) });
    const low = Math.min(...finite);
    const high = Math.max(...finite);
    rows.push({
      label: "Lowest month",
      value: `${formatNumber(low, 0)}`,
    });
    rows.push({
      label: "Highest month",
      value: `${formatNumber(high, 0)}`,
    });
    const tr = calculateTrendPercentage(last, prev);
    if (tr != null && prev != null) {
      rows.push({
        label: "Vs previous month",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    if (bucket) appendMonthGoalMetRate(rows, habit, values, bucket);
    return rows;
  }

  if (habit.type === "duration") {
    if (last != null)
      rows.push({
        label: "This month avg/day",
        value: `${formatNumber(last, 2)} h`,
      });
    if (dailyTgt != null) {
      rows.push({
        label: "Goal",
        value: `${formatNumber(dailyTgt, 2)} h/day`,
      });
      const g = goalDifferenceText(habit, last, dailyTgt);
      if (g) rows.push({ label: "vs goal", value: g });
    }
    const best = Math.max(...finite);
    const low = Math.min(...finite);
    rows.push({
      label: "Best month",
      value: `${formatNumber(best, 2)} h/day`,
    });
    rows.push({
      label: "Lowest month",
      value: `${formatNumber(low, 2)} h/day`,
    });
    const tr = calculateTrendPercentage(last, prev);
    if (tr != null && prev != null) {
      rows.push({
        label: "Vs previous month",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    if (bucket) appendMonthGoalMetRate(rows, habit, values, bucket);
    return rows;
  }

  if (habit.type === "number") {
    const weight = isWeightHabit(habit);
    if (last != null) {
      rows.push({
        label: weight ? "This month avg" : "This month avg/day",
        value: `${formatNumber(last, weight ? 2 : 1)}${u}`,
      });
    }
    if (dailyTgt != null) {
      const tu = habit.target?.unit ?? habit.unit ?? "";
      rows.push({
        label: "Goal",
        value: `${formatNumber(dailyTgt, weight ? 2 : 1)}${tu ? ` ${tu}` : ""}/day`,
      });
      const g = goalDifferenceText(habit, last, dailyTgt);
      if (g) rows.push({ label: "vs goal", value: g });
    }
    const best = Math.max(...finite);
    const low = Math.min(...finite);
    rows.push({
      label: weight ? "Highest month" : "Best month",
      value: `${formatNumber(best, weight ? 2 : 1)}${u}`,
    });
    rows.push({
      label: weight ? "Lowest month" : "Lowest month",
      value: `${formatNumber(low, weight ? 2 : 1)}${u}`,
    });
    const tr = calculateTrendPercentage(last, prev);
    if (tr != null && prev != null) {
      rows.push({
        label: "Vs previous month",
        value: formatTrendLine(tr) ?? "—",
      });
    }
    if (bucket) appendMonthGoalMetRate(rows, habit, values, bucket);
    return rows;
  }

  return rows;
}

/** @deprecated Use buildMonthlySummary */
export function buildWeeklySummary(
  habit: HabitDefinition,
  values: ValuesByDate,
  year: number
): SummaryRow[] {
  return buildMonthlySummary(habit, values, year);
}

export function chartKindForHabit(habit: HabitDefinition): "line" | "bar" {
  if (habit.type === "checkbox" || isBadOccurrenceHabit(habit)) return "bar";
  return "line";
}
