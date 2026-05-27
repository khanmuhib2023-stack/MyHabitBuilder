import type {
  HabitDefinition,
  HabitDefaultValue,
  HabitLogSource,
  HabitScoringKey,
  HabitTarget,
  HabitType,
  HabitValue,
  GymWorkoutKey,
} from "@/lib/flexHabitTypes";
import { defaultValueFor, valueMatchesType } from "@/lib/flexHabitTypes";
import { loadCategories, migrateHabitCategoryId } from "@/lib/categoryUtils";
import { normalizeScoringKey } from "@/lib/scoringEngine";

export const FLEX_HABIT_DEFINITIONS_KEY = "flexHabitDefinitions";
export const FLEX_HABIT_VALUES_KEY = "flexHabitValuesByDate";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const TYPES: HabitType[] = [
  "checkbox",
  "number",
  "duration",
  "gym",
  "five_k",
  "sleep_late",
];

const SCORING_KEYS: HabitScoringKey[] = [
  "generic",
  "study_time",
  "steps",
  "morning_routine",
  "gym",
  "five_k",
  "sleep_late",
  "calories",
  "protein",
  "creatine",
  "bad_habit_rule_1",
  "quran_study",
  "prayer_rakats",
];

function newHabitId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const DEFAULT_HABIT_DEFINITIONS: HabitDefinition[] = [
  {
    id: "seed-study-time",
    name: "Study Time",
    category: "study",
    type: "duration",
    scoringKey: "study_time",
  },
  {
    id: "seed-steps",
    name: "Steps",
    category: "health",
    type: "number",
    unit: "steps",
    scoringKey: "steps",
    target: { value: 10000, mode: "at_least", period: "daily", unit: "steps" },
  },
  {
    id: "seed-morning-routine",
    name: "Morning Routine",
    category: "health",
    type: "number",
    scoringKey: "morning_routine",
  },
  {
    id: "seed-gym",
    name: "Gym",
    category: "health",
    type: "gym",
    scoringKey: "gym",
  },
  {
    id: "seed-5k",
    name: "5K",
    category: "health",
    type: "five_k",
    scoringKey: "five_k",
    meta: { fiveKGoalKm: 5 },
    target: { value: 5, mode: "at_least", period: "daily", unit: "km" },
  },
  {
    id: "seed-sleep-late",
    name: "Sleep Time",
    category: "health",
    type: "sleep_late",
    scoringKey: "sleep_late",
  },
  {
    id: "seed-calories",
    name: "Calories",
    category: "health",
    type: "number",
    unit: "kcal",
    scoringKey: "calories",
    target: { value: 2500, mode: "at_most", period: "daily", unit: "kcal" },
  },
  {
    id: "seed-protein",
    name: "Protein",
    category: "health",
    type: "number",
    unit: "g",
    scoringKey: "protein",
    target: { value: 150, mode: "at_least", period: "daily", unit: "g" },
  },
  {
    id: "seed-creatine",
    name: "Creatine Taken",
    category: "health",
    type: "number",
    unit: "g",
    scoringKey: "creatine",
  },
  {
    id: "seed-rule1",
    name: "Rule Number 1",
    category: "islam",
    type: "number",
    scoringKey: "bad_habit_rule_1",
  },
  {
    id: "seed-quran",
    name: "Quran Study",
    category: "islam",
    type: "duration",
    scoringKey: "quran_study",
  },
  {
    id: "seed-prayer",
    name: "Prayer Times",
    category: "islam",
    type: "number",
    unit: "rakats",
    scoringKey: "prayer_rakats",
  },
];

export type EncodedValue =
  | { k: "c"; v: boolean; s?: "d" | "m" }
  | { k: "n"; v: number; s?: "d" | "m"; u?: 1 }
  | { k: "d"; h: number; m: number; s?: "d" | "m" }
  | {
      k: "g";
      w: GymWorkoutKey;
      e: Record<string, { v: number; s: boolean }>;
      s?: "d" | "m";
    }
  | { k: "5"; km: number; h: number; m: number; s?: "d" | "m" }
  | { k: "sl"; h: number; m: number; s?: "d" | "m" };

function encodeValue(
  val: HabitValue,
  source: HabitLogSource = "manual"
): EncodedValue {
  const s = source === "default" ? "d" : "m";
  switch (val.type) {
    case "checkbox":
      return { k: "c", v: val.checked, s };
    case "number":
      return {
        k: "n",
        v: val.unset ? 0 : val.value,
        s,
        ...(val.unset ? { u: 1 } : {}),
      };
    case "duration":
      return { k: "d", h: val.hours, m: val.minutes, s };
    case "gym":
      return {
        k: "g",
        w: val.workout,
        e: Object.fromEntries(
          Object.entries(val.exercises).map(([id, ex]) => [
            id,
            { v: ex.value, s: ex.sets3Plus },
          ])
        ),
      };
    case "five_k":
      return { k: "5", km: val.distanceKm, h: val.hours, m: val.minutes, s };
    case "sleep_late":
      return { k: "sl", h: val.hoursLate, m: val.minutesLate, s };
  }
}

function decodeValue(raw: unknown, type: HabitType): HabitValue {
  const fallback = defaultValueFor(type);
  if (raw === null || typeof raw !== "object") return fallback;
  const o = raw as EncodedValue;
  if (type === "checkbox" && o.k === "c" && typeof o.v === "boolean") {
    return { type: "checkbox", checked: o.v };
  }
  if (type === "number" && o.k === "n" && typeof o.v === "number") {
    return {
      type: "number",
      value: Math.min(1_000_000_000, Math.max(0, Math.trunc(o.v))),
      unset: o.u === 1,
    };
  }
  if (
    type === "duration" &&
    o.k === "d" &&
    typeof o.h === "number" &&
    typeof o.m === "number"
  ) {
    return {
      type: "duration",
      hours: Math.min(24, Math.max(0, Math.trunc(o.h))),
      minutes: Math.min(59, Math.max(0, Math.trunc(o.m))),
    };
  }
  if (type === "gym" && o.k === "g" && typeof o.w === "string") {
    const ex: Record<string, { value: number; sets3Plus: boolean }> = {};
    if (o.e && typeof o.e === "object") {
      for (const [id, row] of Object.entries(o.e)) {
        if (row && typeof row === "object") {
          const r = row as { v?: number; s?: boolean };
          ex[id] = {
            value: Math.max(0, Math.trunc(Number(r.v) || 0)),
            sets3Plus: Boolean(r.s),
          };
        }
      }
    }
    return {
      type: "gym",
      workout: o.w as GymWorkoutKey,
      exercises: ex,
    };
  }
  if (
    type === "five_k" &&
    o.k === "5" &&
    typeof o.km === "number"
  ) {
    return {
      type: "five_k",
      distanceKm: Math.max(0, o.km),
      hours: Math.min(24, Math.max(0, Math.trunc(o.h ?? 0))),
      minutes: Math.min(59, Math.max(0, Math.trunc(o.m ?? 0))),
    };
  }
  if (
    type === "sleep_late" &&
    o.k === "sl" &&
    typeof o.h === "number" &&
    typeof o.m === "number"
  ) {
    return {
      type: "sleep_late",
      hoursLate: Math.min(12, Math.max(0, Math.trunc(o.h))),
      minutesLate: Math.min(59, Math.max(0, Math.trunc(o.m))),
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
  const goalHours =
    typeof o.goalHours === "number" && Number.isFinite(o.goalHours)
      ? o.goalHours
      : undefined;
  const goalMinutes =
    typeof o.goalMinutes === "number" && Number.isFinite(o.goalMinutes)
      ? o.goalMinutes
      : undefined;
  if (value == null) return undefined;
  if (mode !== "at_least" && mode !== "at_most" && mode !== "exact")
    return undefined;
  if (period !== "daily" && period !== "weekly") return undefined;
  return {
    value,
    mode,
    period,
    unit,
    goalHours,
    goalMinutes,
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
      : "study";
  const target = normalizeTarget(o.target);
  const defaultValue = normalizeDefaultValue(o.defaultValue);
  const rawScoringKey =
    typeof o.scoringKey === "string" ? o.scoringKey : undefined;
  const scoringKey = rawScoringKey
    ? normalizeScoringKey(rawScoringKey)
    : "generic";
  const meta =
    o.meta && typeof o.meta === "object" && !Array.isArray(o.meta)
      ? (o.meta as Record<string, unknown>)
      : undefined;
  if (!id || !name || !TYPES.includes(type)) return null;
  const base: HabitDefinition = { id, name, category, type, unit };
  if (target) base.target = target;
  if (defaultValue) base.defaultValue = defaultValue;
  if (scoringKey !== "generic" && SCORING_KEYS.includes(scoringKey)) {
    base.scoringKey = scoringKey;
  }
  if (meta) base.meta = meta;
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

function isEncodedValue(raw: unknown): raw is EncodedValue {
  if (raw === null || typeof raw !== "object") return false;
  const k = (raw as EncodedValue).k;
  return (
    k === "c" ||
    k === "n" ||
    k === "d" ||
    k === "g" ||
    k === "5" ||
    k === "sl"
  );
}

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
        if (isEncodedValue(enc)) inner[hid] = enc;
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
  return "s" in enc && enc.s === "d" ? "default" : "manual";
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
    const { [habitId]: _, ...rest } = day;
    if (Object.keys(rest).length > 0) next[ymd] = rest;
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
    if ("meta" in patch && patch.meta === undefined) {
      delete merged.meta;
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
    ...(partial.defaultValue ? { defaultValue: partial.defaultValue } : {}),
    ...(partial.scoringKey ? { scoringKey: partial.scoringKey } : {}),
    ...(partial.meta ? { meta: partial.meta } : {}),
  };
  return [...defs, next];
}
