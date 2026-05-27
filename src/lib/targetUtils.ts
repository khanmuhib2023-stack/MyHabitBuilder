import type {

  HabitDefinition,

  HabitTarget,

  HabitValue,

  TargetMode,

} from "@/lib/flexHabitTypes";

import {

  getValueForHabit,

  hasStoredValueForHabit,

  type ValuesByDate,

} from "@/lib/flexHabitStorage";

import {
  habitDefaultAppliesToGraphs,
  resolveDailyActual,
} from "@/lib/defaultValueUtils";
import { parseYmdLocal, toYmd } from "@/lib/weekRange";



function addDaysToYmd(ymd: string, delta: number): string {

  const d = parseYmdLocal(ymd);

  if (Number.isNaN(d.getTime())) return ymd;

  d.setDate(d.getDate() + delta);

  return toYmd(d);

}



function isWeightHabit(habit: HabitDefinition): boolean {

  return (

    habit.type === "number" && habit.name.trim().toLowerCase() === "weight"

  );

}



export function isBadOccurrenceHabit(habit: HabitDefinition): boolean {
  return (
    habit.scoringKey === "bad_habit_rule_1" ||
    (habit.category === "islam" &&
      habit.name.trim().toLowerCase().includes("rule"))
  );
}



/** Compare actual value to target using mode (at_least / at_most / exact). */

export function didMeetTarget(

  actual: number,

  target: HabitTarget | { value: number; mode: TargetMode }

): boolean {

  const { value, mode } = target;

  switch (mode) {

    case "at_least":

      return actual >= value;

    case "at_most":

      return actual <= value;

    case "exact":

      return Math.abs(actual - value) < 1e-6;

    default:

      return false;

  }

}



export function getTargetGap(actual: number, target: HabitTarget): number {

  return actual - target.value;

}



export function formatTargetText(habit: HabitDefinition): string {

  const t = habit.target;

  if (!t) return "Set goal";

  const u = t.unit ?? habit.unit ?? "";

  const suffix = u ? ` ${u}` : "";

  const mode =

    t.mode === "at_least" ? "≥" : t.mode === "at_most" ? "≤" : "=";

  const p = t.period === "weekly" ? "/wk" : "/day";

  return `Goal: ${mode}${t.value.toLocaleString()}${suffix}${p}`;

}



export function numericActualForHabit(

  habit: HabitDefinition,

  val: HabitValue

): number {

  if (val.type === "number") return val.value;

  if (val.type === "checkbox") return val.checked ? 1 : 0;

  if (val.type === "duration") return val.hours + val.minutes / 60;

  return 0;

}



export function getDailyTargetScalar(habit: HabitDefinition): number | null {

  const t = habit.target;

  if (!t) return null;

  if (t.period === "daily") return t.value;

  return t.value / 7;

}



/** Per-month target line for monthly charts (units match monthly aggregates). */
export function getMonthlyChartTargetScalar(
  habit: HabitDefinition,
  bucket: { ymdStart: string; ymdEnd: string }
): number | null {
  const t = habit.target;
  if (!t) return null;

  let days = 0;
  let cur = bucket.ymdStart;
  let guard = 0;
  while (cur <= bucket.ymdEnd && guard++ < 32) {
    days++;
    if (cur === bucket.ymdEnd) break;
    cur = addDaysToYmd(cur, 1);
  }

  if (habit.type === "checkbox") {
    if (t.period === "weekly") return Math.round((days / 7) * t.value);
    return t.value * days;
  }

  if (isBadOccurrenceHabit(habit)) {
    if (t.period === "weekly") return Math.round((days / 7) * t.value);
    if (t.value === 0) return 0;
    return t.value * days;
  }

  if (habit.type === "duration") {
    if (t.period === "weekly") return t.value / 7;
    return t.value;
  }

  if (habit.type === "number") {
    if (isWeightHabit(habit)) return t.value;
    if (t.period === "weekly") return t.value / 7;
    return t.value;
  }

  return null;
}

/** Same units as weekly aggregate in graphUtils.aggregateWeek */

export function getWeeklyChartTargetScalar(

  habit: HabitDefinition

): number | null {

  const t = habit.target;

  if (!t) return null;

  if (habit.type === "checkbox") {

    return t.period === "weekly" ? t.value : t.value * 7;

  }

  if (isBadOccurrenceHabit(habit)) {

    return t.period === "weekly" ? t.value : t.value * 7;

  }

  if (habit.type === "duration") {

    return t.period === "weekly" ? t.value / 7 : t.value;

  }

  if (habit.type === "number") {

    if (isWeightHabit(habit)) return t.value;

    return t.period === "weekly" ? t.value / 7 : t.value;

  }

  return null;

}



function dailyTargetForComparison(habit: HabitDefinition): HabitTarget | null {

  const t = habit.target;

  if (!t) return null;

  const value = getDailyTargetScalar(habit);

  if (value == null) return null;

  return { ...t, value, period: "daily" };

}



/**

 * Whether the habit met its goal on a date.

 * null = no evaluation (e.g. weight not logged); excluded from goal-met %.

 */

export function didHabitMeetTargetOnDate(

  habit: HabitDefinition,

  values: ValuesByDate,

  ymd: string

): boolean | null {

  const t = habit.target;



  if (!t) {

    if (habit.type === "checkbox") {

      const v = getValueForHabit(values, ymd, habit);

      return v.type === "checkbox" && v.checked;

    }

    if (isBadOccurrenceHabit(habit)) {

      const v = getValueForHabit(values, ymd, habit);

      return v.type === "number" && v.value === 0;

    }

    if (habit.type === "number" && !isWeightHabit(habit)) {

      return hasStoredValueForHabit(values, ymd, habit.id);

    }

    if (habit.type === "duration") {

      return hasStoredValueForHabit(values, ymd, habit.id);

    }

    if (isWeightHabit(habit)) {

      return hasStoredValueForHabit(values, ymd, habit.id);

    }

    return null;

  }



  const compareTarget = dailyTargetForComparison(habit);

  if (!compareTarget) return null;



  const hasStored = hasStoredValueForHabit(values, ymd, habit.id);

  const v = getValueForHabit(values, ymd, habit);



  if (isBadOccurrenceHabit(habit)) {

    const actual = v.type === "number" ? v.value : 0;

    return didMeetTarget(actual, compareTarget);

  }



  if (habit.type === "checkbox") {

    const actual = v.type === "checkbox" && v.checked ? 1 : 0;

    return didMeetTarget(actual, compareTarget);

  }



  if (!hasStored) {
    if (habitDefaultAppliesToGraphs(habit)) {
      const { value } = resolveDailyActual(habit, values, ymd);
      if (value == null) return null;
      return didMeetTarget(value, compareTarget);
    }
    return null;
  }

  const actual = numericActualForHabit(habit, v);

  return didMeetTarget(actual, compareTarget);

}



export function calculateHabitStreak(

  habit: HabitDefinition,

  values: ValuesByDate,

  endYmd: string

): number {

  let streak = 0;

  let d = endYmd;

  for (let i = 0; i < 365 * 5; i++) {

    const ok = didHabitMeetTargetOnDate(habit, values, d);

    if (ok === true) {

      streak++;

      d = addDaysToYmd(d, -1);

    } else if (ok === null && !habit.target) {

      if (!hasStoredValueForHabit(values, d, habit.id)) break;

      streak++;

      d = addDaysToYmd(d, -1);

    } else {

      break;

    }

  }

  return streak;

}



export function streakLabel(habit: HabitDefinition, streak: number): string {

  if (streak <= 0) return "";

  if (isBadOccurrenceHabit(habit)) {

    return `Avoided streak: ${streak} day${streak === 1 ? "" : "s"}`;

  }

  return `Streak: ${streak} day${streak === 1 ? "" : "s"}`;

}



export function todayStatusLine(

  habit: HabitDefinition,

  values: ValuesByDate,

  ymd: string

): string | null {

  const met = didHabitMeetTargetOnDate(habit, values, ymd);

  if (habit.target) {

    if (met === true) {

      if (habit.target.mode === "at_most") return "Within goal today";

      if (habit.target.mode === "exact") return "At goal today";

      return "Goal met today";

    }

    if (met === false) return "Not at goal today";

    return null;

  }

  if (habit.type === "checkbox") {

    const v = getValueForHabit(values, ymd, habit);

    if (v.type === "checkbox" && v.checked) return "Completed today";

  }

  return null;

}



/** Fraction of days in range where goal was met (0–100). Skips unevaluated days. */

export function calculateTargetAchievementRate(

  habit: HabitDefinition,

  values: ValuesByDate,

  ymds: string[]

): number | null {

  return calculateGoalMetRate(habit, values, ymds);

}



export function calculateGoalMetRate(

  habit: HabitDefinition,

  values: ValuesByDate,

  ymds: string[]

): number | null {

  if (!habit.target) return null;

  let met = 0;

  let counted = 0;

  for (const y of ymds) {

    const r = didHabitMeetTargetOnDate(habit, values, y);

    if (r === null) continue;

    counted++;

    if (r === true) met++;

  }

  if (counted === 0) return null;

  return (met / counted) * 100;

}



function trendUsesMissingAsZero(habit: HabitDefinition): boolean {
  return habit.type === "checkbox" || isBadOccurrenceHabit(habit);
}

function trendCapMax(
  habit: HabitDefinition,
  logged: number[],
  targetScalar: number | null
): number {
  const peak = Math.max(...logged, targetScalar ?? 0, 0);
  return peak * 1.2 + 1;
}

/** Linear trend for charts; uses logged values only unless zeros are meaningful (binary/bad). */
export function calculateChartTrend(
  habit: HabitDefinition,
  series: (number | null)[]
): (number | null)[] {
  const pts: { x: number; y: number }[] = [];
  if (trendUsesMissingAsZero(habit)) {
    series.forEach((y, i) => {
      const val = y != null && Number.isFinite(y) ? y : 0;
      pts.push({ x: i, y: val });
    });
  } else {
    series.forEach((y, i) => {
      if (y != null && Number.isFinite(y)) pts.push({ x: i, y });
    });
  }
  if (pts.length < 2) return series.map(() => null);

  pts.sort((a, b) => a.x - b.x);
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return series.map(() => null);

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const firstX = pts[0].x;
  const lastX = pts[pts.length - 1].x;
  const loggedY = pts.map((p) => p.y);
  const cap = trendCapMax(
    habit,
    loggedY,
    habit.target ? getDailyTargetScalar(habit) : null
  );
  const clampFloor = !isWeightHabit(habit);

  return series.map((_, i) => {
    if (!trendUsesMissingAsZero(habit) && (i < firstX || i > lastX)) {
      return null;
    }
    let t = slope * i + intercept;
    if (!Number.isFinite(t)) return null;
    if (clampFloor) t = Math.max(0, t);
    if (habit.type === "checkbox") t = Math.min(1, t);
    if (habit.type === "duration") t = Math.max(0, t);
    if (!isWeightHabit(habit)) {
      t = Math.min(t, cap);
    } else {
      const wMin = Math.min(...loggedY);
      const wMax = Math.max(...loggedY);
      const pad = Math.max(0.25, (wMax - wMin) * 0.15);
      t = Math.max(wMin - pad, Math.min(wMax + pad, t));
    }
    return t;
  });
}

/** @deprecated Use calculateChartTrend(habit, series) */
export function calculateLinearTrend(
  ys: (number | null)[]
): (number | null)[] {
  return ys.map(() => null);
}



export function goalDifferenceText(

  habit: HabitDefinition,

  avg: number | null,

  targetScalar: number | null

): string | null {

  if (avg == null || targetScalar == null || !habit.target) return null;

  const met = didMeetTarget(avg, {

    value: targetScalar,

    mode: habit.target.mode,

  });

  const diff = avg - targetScalar;

  const u = habit.target.unit ?? habit.unit ?? "";

  const abs = Math.abs(diff);

  const n = u

    ? `${abs.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${u}`

    : abs.toFixed(1);

  if (habit.target.mode === "at_most") {

    return met ? `${n} within goal` : `${n} above goal`;

  }

  if (habit.target.mode === "at_least") {

    return met ? `${n} above goal` : `${n} below goal`;

  }

  if (met) return "On target";

  return `${n} from goal`;

}



export function trendDirectionLabel(
  habit: HabitDefinition,
  series: (number | null)[]
): string | null {
  if (trendUsesMissingAsZero(habit)) {
    const trend = calculateChartTrend(habit, series);
    const pts = trend.filter((v): v is number => v != null);
    if (pts.length < 2) return "Not enough data";
    const ys = series.map((y) => (y != null && Number.isFinite(y) ? y : 0));
    const spread = Math.max(...ys) - Math.min(...ys);
    const threshold = Math.max(spread * 0.05, 1e-6);
    const delta = pts[pts.length - 1] - pts[0];
    if (Math.abs(delta) <= threshold) return "Stable";
    if (delta > 0) return "Increasing";
    return "Decreasing";
  }

  const logged: number[] = [];
  for (const y of series) {
    if (y != null && Number.isFinite(y)) logged.push(y);
  }
  if (logged.length < 2) return "Not enough data";

  const first = logged[0];
  const last = logged[logged.length - 1];
  const spread = Math.max(...logged) - Math.min(...logged);
  const threshold = Math.max(spread * 0.05, 1e-6);
  const delta = last - first;
  if (Math.abs(delta) <= threshold) return "Stable";
  if (delta > 0) return "Increasing";
  return "Decreasing";
}


