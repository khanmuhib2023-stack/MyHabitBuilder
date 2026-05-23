import type { HabitDefinition } from "@/lib/flexHabitTypes";
import {
  getDailyTargetScalar,
  getWeeklyChartTargetScalar,
} from "@/lib/targetUtils";
import { isBadOccurrenceHabit, isWeightHabit } from "@/lib/graphUtils";

export type ChartValuePoint = {
  actual: number | null;
  target?: number | null;
};

function habitNameLower(habit: HabitDefinition): string {
  return habit.name.trim().toLowerCase();
}

function isStepsHabit(habit: HabitDefinition): boolean {
  const u = habit.unit?.toLowerCase() ?? "";
  return u.includes("step") || habitNameLower(habit).includes("step");
}

function isCaloriesHabit(habit: HabitDefinition): boolean {
  const u = habit.unit?.toLowerCase() ?? "";
  const n = habitNameLower(habit);
  return u.includes("kcal") || n.includes("calor");
}

function isProteinHabit(habit: HabitDefinition): boolean {
  const u = habit.unit?.toLowerCase() ?? "";
  const n = habitNameLower(habit);
  return (u === "g" || u.endsWith(" g")) && n.includes("protein");
}

function niceCeil(max: number, step: number): number {
  if (max <= 0) return step;
  return Math.ceil(max / step) * step;
}

/** Y-axis from actual + target only (never trend). */
export function getYAxisDomain(
  habit: HabitDefinition,
  points: ChartValuePoint[],
  opts: {
    weekCompletion?: boolean;
    kind: "line" | "bar";
    weeklyChart?: boolean;
    monthlyChart?: boolean;
  }
): [number, number] {
  if (opts.weekCompletion) return [0, 7];

  const values: number[] = [];
  for (const p of points) {
    if (p.actual != null && Number.isFinite(p.actual)) values.push(p.actual);
    if (p.target != null && Number.isFinite(p.target)) values.push(p.target);
  }

  if (!opts.monthlyChart) {
    const chartTarget = opts.weeklyChart
      ? getWeeklyChartTargetScalar(habit)
      : getDailyTargetScalar(habit);
    if (chartTarget != null) values.push(chartTarget);
  }

  if (isWeightHabit(habit)) {
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 0.5);
    const pad = Math.max(0.25, span * 0.1);
    return [min - pad, max + pad];
  }

  if (habit.type === "checkbox" && !opts.weekCompletion) {
    if (opts.monthlyChart) {
      const max = values.length ? Math.max(...values, 0) : 1;
      const top = Math.max(1, Math.ceil(max * 1.1));
      return [0, top];
    }
    return [0, 1];
  }

  if (
    isBadOccurrenceHabit(habit) ||
    (habit.type === "checkbox" && opts.kind === "bar")
  ) {
    const max = values.length ? Math.max(...values, 0) : 1;
    const top = Math.max(1, Math.ceil(max * 1.1));
    return [0, top];
  }

  const max = values.length ? Math.max(...values, 0) : 0;
  if (max <= 0) return [0, 1];

  let top = max * 1.1;
  if (isStepsHabit(habit)) top = niceCeil(top, 2500);
  else if (isCaloriesHabit(habit)) top = niceCeil(top, 500);
  else if (isProteinHabit(habit)) top = niceCeil(top, 50);
  else if (habit.type === "duration") top = niceCeil(top, 0.5) || 1;
  else if (top < 5) top = Math.max(1, Math.ceil(top * 10) / 10);
  else top = Math.ceil(top);

  return [0, top];
}

export function formatYAxisTick(
  value: number,
  habit: HabitDefinition
): string {
  if (!Number.isFinite(value)) return "";
  if (habit.type === "checkbox" || isBadOccurrenceHabit(habit)) {
    return String(Math.round(value));
  }
  if (habit.type === "duration") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (isWeightHabit(habit)) {
    return value.toFixed(1);
  }
  if (isStepsHabit(habit)) {
    return Math.round(value).toLocaleString();
  }
  if (isCaloriesHabit(habit)) {
    return Math.round(value).toLocaleString();
  }
  if (isProteinHabit(habit)) {
    return String(Math.round(value));
  }
  if (value > 0 && value < 10 && !Number.isInteger(value)) {
    return value.toFixed(1);
  }
  return String(Math.round(value));
}

export function weeklyXTickLabel(
  index: number,
  point: { label: string; monthTick: string; weekOfMonth: number },
  mode: "card" | "expanded"
): string {
  if (mode === "card") {
    return point.monthTick || "";
  }
  if (point.weekOfMonth === 1) {
    return point.label.replace(/^Week\s+/, "");
  }
  if (index % 4 === 0) {
    return point.label.replace(/^Week\s+/, "");
  }
  return "";
}
