import type {
  HabitDefinition,
  HabitDefaultValue,
  HabitLogSource,
  HabitTarget,
  HabitType,
  HabitValue,
} from "@/lib/flexHabitTypes";
import { defaultValueFor, valueMatchesType } from "@/lib/flexHabitTypes";
import { loadCategories, migrateHabitCategoryId } from "@/lib/categoryUtils";

export const FLEX_HABIT_DEFINITIONS_KEY = "flexHabitDefinitions";
export const FLEX_HABIT_VALUES_KEY = "flexHabitValuesByDate";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const TYPES: HabitType[] = ["checkbox", "number", "duration"];

function newHabitId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Starter habits matching the product examples (editable by the user). */
export const DEFAULT_HABIT_DEFINITIONS: HabitDefinition[] = [
  {
    id: "seed-steps",
    name: "Steps",
    category: "health",
    type: "number",
    unit: "steps",
  },
  {
    id: "seed-weight",
    name: "Weight",
    category: "health",
    type: "number",
    unit: "kg",
  },
  {
    id: "seed-sleep",
    name: "Sleep",
    category: "health",
    type: "duration",
  },
  {
    id: "seed-calories",
    name: "Calories",
    category: "good",
    type: "number",
    unit: "kcal",
  },
  {
    id: "seed-protein",
    name: "Protein",
    category: "good",
    type: "number",
    unit: "g",
  },
  {
    id: "seed-prayer",
    name: "Prayer",
    category: "good",
    type: "number",
  },
  {
    id: "seed-creatine",
    name: "Creatine",
    category: "binary",
    type: "checkbox",
  },
  {
    id: "seed-addiction",
    name: "Addiction",
    category: "bad",
    type: "number",
  },
];

type EncodedValue =
  | { k: "c"; v: boolean; s?: "d" | "m" }
  | { k: "n"; v: number; s?: "d" | "m" }
  | { k: "d"; h: number; m: number; s?: "d" | "m" };

function encodeValue(
  val: HabitValue,
  source: HabitLogSource = "manual"
): EncodedValue {
  const s = source === "default" ? "d" : "m";
  switch (val.type) {
    case "checkbox":
      return { k: "c", v: val.checked, s };
    case "number":
      return { k: "n", v: val.value, s };
    case "duration":
      return { k: "d", h: val.hours, m: val.minutes, s };
  }
}

function decodeValue(raw: unknown, type: HabitType): HabitValue {
  const fallback = defaultValueFor(type);
  if (raw === null || typeof raw !== "object") return fallback;
  const o = raw as EncodedValue;
  if (type === "checkbox" && o.k === "c" && typeof o.v === "boolean") {
    return { type: "checkbox", checked: o.v };
  }
  if (
    type === "number" &&
    o.k === "n" &&
    typeof o.v === "number" &&
    Number.isFinite(o.v)
  ) {
    return {
      type: "number",
      value: Math.min(1_000_000_000, Math.max(0, Math.trunc(o.v))),
    };
  }
  if (
    type === "duration" &&
    o.k === "d" &&
    typeof o.h === "number" &&
    typeof o.m === "number" &&
    Number.isFinite(o.h) &&
    Number.isFinite(o.m)
  ) {
    return {
      type: "duration",
      hours: Math.min(24, Math.max(0, Math.trunc(o.h))),
      minutes: Math.min(59, Math.max(0, Math.trunc(o.m))),
    };
  }
  return fallback;
}

function normalizeDefaultValue(raw: unknown): HabitDefaultValue | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const enabled = o.enabled === true;
  const value =
    typeof o.value === "number" && Number.isFinite(o.value) ? o.value : null;
  const applyMode = o.applyMode;
  const unit =
    typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : undefined;
  if (value == null) return undefined;
  if (
    applyMode !== "manual_fill" &&
    applyMode !== "use_for_missing_graph_data"
  ) {
    return undefined;
  }
  return { enabled, value, unit, applyMode };
}

function normalizeTarget(raw: unknown): HabitTarget | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const value =
    typeof o.value === "number" && Number.isFinite(o.value) ? o.value : null;
  const mode = o.mode;
  const period = o.period;
  const unit =
    typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : undefined;
  if (value == null) return undefined;
  if (mode !== "at_least" && mode !== "at_most" && mode !== "exact")
    return undefined;
  if (period !== "daily" && period !== "weekly") return undefined;
  return {
    value,
    mode,
    period,
    unit,
  };
}

function normalizeDefinition(raw: unknown): HabitDefinition | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.length > 0 ? o.id : null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const type = o.type as HabitType;
  const unit =
    typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : undefined;
  const cats = loadCategories();
  const category =
    typeof o.category === "string" && o.category.trim()
      ? migrateHabitCategoryId(o.category.trim(), cats)
      : "good";
  const target = normalizeTarget(o.target);
  const defaultValue = normalizeDefaultValue(o.defaultValue);
  if (!id || !name || !TYPES.includes(type)) return null;
  const base: HabitDefinition = { id, name, category, type, unit };
  if (target) base.target = target;
  if (defaultValue) base.defaultValue = defaultValue;
  return base;
}

export function loadDefinitions(): HabitDefinition[] {
  if (typeof window === "undefined") return [...DEFAULT_HABIT_DEFINITIONS];
  try {
    const raw = localStorage.getItem(FLEX_HABIT_DEFINITIONS_KEY);
    if (raw == null || raw === "") return [...DEFAULT_HABIT_DEFINITIONS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_HABIT_DEFINITIONS];
    const out: HabitDefinition[] = [];
    for (const item of parsed) {
      const d = normalizeDefinition(item);
      if (d) out.push(d);
    }
    return out;
  } catch {
    return [...DEFAULT_HABIT_DEFINITIONS];
  }
}

export function saveDefinitions(defs: HabitDefinition[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FLEX_HABIT_DEFINITIONS_KEY, JSON.stringify(defs));
}

export type ValuesByDate = Record<string, Record<string, EncodedValue>>;

export function loadValues(): ValuesByDate {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FLEX_HABIT_VALUES_KEY);
    if (raw == null || raw === "") return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const out: ValuesByDate = {};
    for (const [ymd, day] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (!YMD.test(ymd)) continue;
      if (day === null || typeof day !== "object" || Array.isArray(day))
        continue;
      const inner: Record<string, EncodedValue> = {};
      for (const [hid, enc] of Object.entries(day as Record<string, unknown>)) {
        if (typeof hid !== "string" || hid.length === 0) continue;
        if (enc === null || typeof enc !== "object") continue;
        const e = enc as EncodedValue;
        if (e.k === "c" && typeof e.v === "boolean") inner[hid] = e;
        else if (e.k === "n" && typeof e.v === "number") inner[hid] = e;
        else if (
          e.k === "d" &&
          typeof e.h === "number" &&
          typeof e.m === "number"
        )
          inner[hid] = e;
      }
      out[ymd] = inner;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveValues(data: ValuesByDate): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FLEX_HABIT_VALUES_KEY, JSON.stringify(data));
}

export function hasStoredValueForHabit(
  values: ValuesByDate,
  ymd: string,
  habitId: string
): boolean {
  const day = values[ymd];
  return Boolean(day && Object.prototype.hasOwnProperty.call(day, habitId));
}

export function hasAnyStoredLogForHabit(
  values: ValuesByDate,
  habitId: string
): boolean {
  for (const day of Object.values(values)) {
    if (day && Object.prototype.hasOwnProperty.call(day, habitId)) return true;
  }
  return false;
}

export function getValueForHabit(
  values: ValuesByDate,
  ymd: string,
  habit: HabitDefinition
): HabitValue {
  const day = values[ymd];
  const enc = day?.[habit.id];
  if (!enc) return defaultValueFor(habit.type);
  const decoded = decodeValue(enc, habit.type);
  return valueMatchesType(decoded, habit.type)
    ? decoded
    : defaultValueFor(habit.type);
}

export function getLogSourceForHabit(
  values: ValuesByDate,
  ymd: string,
  habitId: string
): HabitLogSource | null {
  const enc = values[ymd]?.[habitId];
  if (!enc) return null;
  return enc.s === "d" ? "default" : "manual";
}

export function setValueForHabit(
  values: ValuesByDate,
  ymd: string,
  habit: HabitDefinition,
  val: HabitValue,
  source: HabitLogSource = "manual"
): ValuesByDate {
  const normalized = valueMatchesType(val, habit.type)
    ? val
    : defaultValueFor(habit.type);
  const next: ValuesByDate = { ...values, [ymd]: { ...values[ymd] } };
  next[ymd] = {
    ...next[ymd],
    [habit.id]: encodeValue(normalized, source),
  };
  return next;
}

export function removeHabitFromValues(
  values: ValuesByDate,
  habitId: string
): ValuesByDate {
  const next: ValuesByDate = {};
  for (const [ymd, day] of Object.entries(values)) {
    if (!day || typeof day !== "object") continue;
    const copy = { ...day };
    delete copy[habitId];
    if (Object.keys(copy).length > 0) next[ymd] = copy;
  }
  return next;
}

export function updateHabitDefinition(
  defs: HabitDefinition[],
  habitId: string,
  patch: Partial<HabitDefinition>
): HabitDefinition[] {
  return defs.map((h) => {
    if (h.id !== habitId) return h;
    const merged: HabitDefinition = { ...h, ...patch, id: h.id };
    if ("target" in patch && patch.target === undefined) {
      delete merged.target;
    }
    if ("defaultValue" in patch && patch.defaultValue === undefined) {
      delete merged.defaultValue;
    }
    return merged;
  });
}

export function appendDefinition(
  defs: HabitDefinition[],
  partial: Omit<HabitDefinition, "id">
): HabitDefinition[] {
  const unit =
    partial.type === "number" && partial.unit?.trim()
      ? partial.unit.trim()
      : undefined;
  const next: HabitDefinition = {
    id: newHabitId(),
    name: partial.name.trim(),
    category: partial.category,
    type: partial.type,
    unit,
    ...(partial.target ? { target: partial.target } : {}),
  };
  return [...defs, next];
}
