import type { FlexCategory } from "@/lib/categoryUtils";
import { categoryLabel } from "@/lib/categoryUtils";
import type { CloudHabitInput, CloudLogInput } from "@/lib/cloudStorage";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_IDS,
  type DefaultCategoryId,
  type HabitDefinition,
  type HabitType,
} from "@/lib/flexHabitTypes";
import type { ValuesByDate } from "@/lib/flexHabitStorage";
import type { HabitLogSource } from "@/lib/flexHabitTypes";

type EncodedValue =
  | { k: "c"; v: boolean; s?: "d" | "m" }
  | { k: "n"; v: number; s?: "d" | "m" }
  | { k: "d"; h: number; m: number; s?: "d" | "m" };

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
  };
}

export function encodeValueForCloud(
  enc: EncodedValue,
  habit: HabitDefinition,
  syncCode: string,
  habitId: string,
  logDate: string,
  categoryName: string
): CloudLogInput {
  const source = enc.s === "d" ? "default" : "manual";
  const ts = `${logDate}T12:00:00.000Z`;
  const base = {
    sync_code: syncCode,
    habit_id: habitId,
    habit_name: habit.name,
    category_name: categoryName,
    log_date: logDate,
    timestamp: ts,
    source,
    unit: habit.unit ?? null,
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
      value: enc.v,
      count: null,
    };
  }
  return {
    ...base,
    log_type: "duration",
    value: enc.h * 60 + enc.m,
    count: null,
  };
}

export function decodeValueFromCloud(
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
    const v = log.value ?? 0;
    return { k: "n", v, ...(s ? { s } : {}) };
  }
  if (type === "duration" || log.log_type === "duration") {
    const total = log.value ?? 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return { k: "d", h, m, ...(s ? { s } : {}) };
  }
  return null;
}

export function logSourceFromEncoded(enc: EncodedValue): HabitLogSource {
  return enc.s === "d" ? "default" : "manual";
}
