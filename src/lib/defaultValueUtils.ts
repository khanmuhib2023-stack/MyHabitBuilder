import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";
import {
  getValueForHabit,
  hasStoredValueForHabit,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import { isBadOccurrenceHabit, isWeightHabit } from "@/lib/graphUtils";

export function habitDefaultAppliesToGraphs(habit: HabitDefinition): boolean {
  const d = habit.defaultValue;
  return Boolean(d?.enabled && d.applyMode === "use_for_missing_graph_data");
}

export function formatDefaultText(habit: HabitDefinition): string {
  const label = formatDefaultLabel(habit);
  return label ? `Default: ${label}` : "Set default";
}

export function formatDefaultLabel(habit: HabitDefinition): string | null {
  const d = habit.defaultValue;
  if (!d?.enabled) return null;
  const u = d.unit ?? habit.unit ?? "";
  const n = d.value.toLocaleString(undefined, {
    maximumFractionDigits: habit.type === "duration" ? 2 : 0,
  });
  return u ? `${n} ${u}` : n;
}

export function valueFromDefault(habit: HabitDefinition): HabitValue | null {
  const d = habit.defaultValue;
  if (!d?.enabled) return null;
  switch (habit.type) {
    case "number":
      return {
        type: "number",
        value: Math.min(1_000_000_000, Math.max(0, Math.trunc(d.value))),
      };
    case "checkbox":
      return { type: "checkbox", checked: d.value >= 1 };
    case "duration": {
      const total = Math.max(0, d.value);
      const hours = Math.min(24, Math.floor(total));
      const minutes = Math.min(59, Math.round((total - hours) * 60));
      return { type: "duration", hours, minutes };
    }
    default:
      return null;
  }
}

export type ResolvedDailyActual = {
  value: number | null;
  assumed: boolean;
};

/** Logged value, or graph default when configured; never treats missing as 0 for number habits. */
export function resolveDailyActual(
  habit: HabitDefinition,
  values: ValuesByDate,
  ymd: string
): ResolvedDailyActual {
  const hasStored = hasStoredValueForHabit(values, ymd, habit.id);
  const v = getValueForHabit(values, ymd, habit);

  if (habit.type === "number") {
    if (isBadOccurrenceHabit(habit)) {
      return { value: v.type === "number" ? v.value : 0, assumed: false };
    }
    if (isWeightHabit(habit)) {
      if (!hasStored || v.type !== "number") return { value: null, assumed: false };
      return { value: v.value, assumed: false };
    }
    if (hasStored && v.type === "number") {
      return { value: v.value, assumed: false };
    }
    if (habitDefaultAppliesToGraphs(habit)) {
      const d = habit.defaultValue!;
      return { value: d.value, assumed: true };
    }
    return { value: null, assumed: false };
  }

  if (habit.type === "checkbox") {
    return {
      value: v.type === "checkbox" && v.checked ? 1 : 0,
      assumed: false,
    };
  }

  if (habit.type === "duration") {
    if (hasStored && v.type === "duration") {
      return { value: v.hours + v.minutes / 60, assumed: false };
    }
    if (habitDefaultAppliesToGraphs(habit)) {
      return { value: habit.defaultValue!.value, assumed: true };
    }
    return { value: null, assumed: false };
  }

  return { value: null, assumed: false };
}
