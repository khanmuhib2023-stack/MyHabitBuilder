import type { FlexCategory } from "@/lib/categoryUtils";
import { categoryLabel } from "@/lib/categoryUtils";
import type { CloudHabitInput, CloudLogInput } from "@/lib/cloudStorage";
import { computeDailyScore } from "@/lib/scoringEngine";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_IDS,
  type DefaultCategoryId,
  type HabitDefinition,
  type HabitType,
  type HabitValue,
} from "@/lib/flexHabitTypes";
import {
  getValueForHabit,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import type { EncodedValue } from "@/lib/flexHabitStorage";
import type { HabitLogSource } from "@/lib/flexHabitTypes";

function isDefaultCategoryId(id: string): id is DefaultCategoryId {
  return (DEFAULT_CATEGORY_IDS as readonly string[]).includes(id);
}

export function habitToCloudInput(
  habit: Omit<HabitDefinition, "id"> & { id?: string },
  syncCode: string,
  cats: FlexCategory[]
): CloudHabitInput {
  const categoryName = categoryLabel(cats, habit.category);
  const isDefault = isDefaultCategoryId(habit.category);
  return {
    sync_code: syncCode,
    name: habit.name,
    category_id: isDefault ? null : habit.category,
    category_name: isDefault
      ? CATEGORY_LABELS[habit.category as DefaultCategoryId]
      : categoryName,
    habit_type: habit.type,
    unit: habit.unit ?? null,
    target: habit.target ?? null,
    default_value: habit.defaultValue ?? null,
    scoring_key: habit.scoringKey ?? null,
    meta: habit.meta ?? null,
  };
}

function encodedToHabitValue(enc: EncodedValue, habit: HabitDefinition): HabitValue {
  switch (enc.k) {
    case "c":
      return { type: "checkbox", checked: enc.v };
    case "n":
      return { type: "number", value: enc.v, unset: enc.u === 1 };
    case "d":
      return { type: "duration", hours: enc.h, minutes: enc.m };
    case "g":
      return {
        type: "gym",
        workout: enc.w as import("@/lib/flexHabitTypes").GymWorkoutKey,
        exercises: Object.fromEntries(
          Object.entries(enc.e ?? {}).map(([id, row]) => [
            id,
            { value: row.v, sets3Plus: row.s },
          ])
        ),
      };
    case "5":
      return {
        type: "five_k",
        distanceKm: enc.km,
        hours: enc.h,
        minutes: enc.m,
      };
    case "sl":
      return {
        type: "sleep_late",
        hoursLate: enc.h,
        minutesLate: enc.m,
      };
    default:
      return getValueForHabit({}, "", habit);
  }
}

export function encodeValueForCloud(
  enc: EncodedValue,
  habit: HabitDefinition,
  syncCode: string,
  habitId: string,
  logDate: string,
  categoryName: string
): CloudLogInput {
  const source =
    "s" in enc && enc.s === "d" ? "default" : "manual";
  const ts = `${logDate}T12:00:00.000Z`;
  const habitValue = encodedToHabitValue(enc, habit);
  const score = computeDailyScore(habit, habitValue);
  const base = {
    sync_code: syncCode,
    habit_id: habitId,
    habit_name: habit.name,
    category_name: categoryName,
    log_date: logDate,
    timestamp: ts,
    source,
    unit: habit.unit ?? null,
    score,
    payload: enc as unknown as Record<string, unknown>,
  };
  if (enc.k === "c") {
    return {
      ...base,
      log_type: "checkbox",
      count: enc.v ? 1 : 0,
      value: null,
    };
  }
  if (enc.k === "n") {
    return {
      ...base,
      log_type: "number",
      value: enc.u === 1 ? null : enc.v,
      count: enc.u === 1 ? null : null,
    };
  }
  if (enc.k === "d") {
    return {
      ...base,
      log_type: "duration",
      value: enc.h * 60 + enc.m,
      count: null,
    };
  }
  if (enc.k === "g") {
    return {
      ...base,
      log_type: "gym",
      value: null,
      count: null,
    };
  }
  if (enc.k === "5") {
    return {
      ...base,
      log_type: "five_k",
      value: enc.km,
      count: enc.h * 60 + enc.m,
    };
  }
  return {
    ...base,
    log_type: "sleep_late",
    value: enc.h * 60 + enc.m,
    count: null,
  };
}

function payloadToEncoded(
  payload: unknown,
  log: {
    log_type: string | null;
    value: number | null;
    count: number | null;
    source: string | null;
  },
  type: HabitType
): EncodedValue | null {
  if (payload && typeof payload === "object" && "k" in payload) {
    return payload as EncodedValue;
  }
  return decodeValueFromCloudLegacy(log, type);
}

function decodeValueFromCloudLegacy(
  log: {
    log_type: string | null;
    value: number | null;
    count: number | null;
    source: string | null;
  },
  type: HabitType
): EncodedValue | null {
  const s: "d" | "m" | undefined =
    log.source === "default" ? "d" : log.source === "manual" ? "m" : undefined;
  if (type === "checkbox" || log.log_type === "checkbox") {
    const checked = (log.count ?? log.value ?? 0) >= 1;
    return { k: "c", v: checked, ...(s ? { s } : {}) };
  }
  if (type === "number" || log.log_type === "number") {
    const v = log.value;
    if (v == null) return { k: "n", v: 0, u: 1, ...(s ? { s } : {}) };
    return { k: "n", v, ...(s ? { s } : {}) };
  }
  if (type === "duration" || log.log_type === "duration") {
    const total = log.value ?? 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return { k: "d", h, m, ...(s ? { s } : {}) };
  }
  if (type === "five_k" || log.log_type === "five_k") {
    return {
      k: "5",
      km: log.value ?? 0,
      h: Math.floor((log.count ?? 0) / 60),
      m: (log.count ?? 0) % 60,
      ...(s ? { s } : {}),
    };
  }
  if (type === "sleep_late" || log.log_type === "sleep_late") {
    const total = log.value ?? 0;
    return {
      k: "sl",
      h: Math.floor(total / 60),
      m: total % 60,
      ...(s ? { s } : {}),
    };
  }
  return null;
}

export function decodeValueFromCloud(
  log: {
    log_type: string | null;
    value: number | null;
    count: number | null;
    source: string | null;
    payload?: unknown;
  },
  type: HabitType
): EncodedValue | null {
  return payloadToEncoded(log.payload, log, type);
}

export function logSourceFromEncoded(enc: EncodedValue): HabitLogSource {
  return "s" in enc && enc.s === "d" ? "default" : "manual";
}

/** Sum daily scores for a date from stored values. */
export function totalDailyScore(
  definitions: HabitDefinition[],
  values: ValuesByDate,
  ymd: string
): number {
  let sum = 0;
  for (const h of definitions) {
    const v = getValueForHabit(values, ymd, h);
    const s = computeDailyScore(h, v);
    if (s != null && Number.isFinite(s)) sum += s;
  }
  return Math.round(sum * 10) / 10;
}
