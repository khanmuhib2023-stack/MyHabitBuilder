import type {
  HabitDefinition,
  HabitLogSource,
  HabitType,
  HabitValue,
} from "@/lib/flexHabitTypes";
import {
  loadCategories,
  categoryLabel,
  ensureCategoryForHabits,
  saveCategories,
  type FlexCategory,
} from "@/lib/categoryUtils";
import { addHabitComment, newCommentId } from "@/lib/commentStorage";
import {
  appendDefinition,
  loadDefinitions,
  loadValues,
  saveDefinitions,
  saveValues,
  setValueForHabit,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import { parseCsvText } from "@/lib/csvUtils";
import { toYmd } from "@/lib/weekRange";

export type ImportRowStatus = "ready" | "warning" | "error" | "duplicate";

export type ParsedImportRow = {
  rowNumber: number;
  habitName: string;
  habitId: string | null;
  ymd: string;
  timestamp: string;
  timeLabel: string;
  value: number | null;
  count: number | null;
  unit: string;
  comment: string;
  source: HabitLogSource;
  logType: HabitType | null;
  categoryInput: string;
  status: ImportRowStatus;
  message: string;
};

export type ImportPreview = {
  rows: ParsedImportRow[];
  totalRows: number;
  ready: number;
  warning: number;
  error: number;
  duplicates: number;
};

export type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  skippedErrors: number;
  habitsCreated: number;
  commentsAdded: number;
};

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((h, i) => {
    rec[normHeader(h)] = (cells[i] ?? "").trim();
  });
  return rec;
}

function parseNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseDateToYmd(dateRaw: string): string | null {
  const t = dateRaw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return toYmd(d);
}

function parseTimePart(timeRaw: string): { h: number; m: number } {
  const t = timeRaw.trim();
  if (!t) return { h: 12, m: 0 };
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    return {
      h: Math.min(23, Math.max(0, Number(m[1]))),
      m: Math.min(59, Math.max(0, Number(m[2]))),
    };
  }
  return { h: 12, m: 0 };
}

function buildTimestamp(ymd: string, timeRaw: string, tsRaw: string): string | null {
  if (tsRaw.trim()) {
    const d = new Date(tsRaw.trim());
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const y = parseDateToYmd(ymd);
  if (!y) return null;
  const { h, m } = parseTimePart(timeRaw);
  const d = new Date(
    Number(y.slice(0, 4)),
    Number(y.slice(5, 7)) - 1,
    Number(y.slice(8, 10)),
    h,
    m,
    0,
    0
  );
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function findHabit(
  defs: HabitDefinition[],
  habitId: string,
  habitName: string
): HabitDefinition | null {
  if (habitId) {
    const byId = defs.find((h) => h.id === habitId);
    if (byId) return byId;
  }
  const lower = habitName.trim().toLowerCase();
  if (!lower) return null;
  return defs.find((h) => h.name.trim().toLowerCase() === lower) ?? null;
}

function resolveCategoryId(
  cats: FlexCategory[],
  categoryInput: string
): string {
  const t = categoryInput.trim();
  if (!t) return "good";
  const byId = cats.find((c) => c.id === t);
  if (byId) return byId.id;
  const lower = t.toLowerCase();
  const byName = cats.find((c) => c.name.trim().toLowerCase() === lower);
  if (byName) return byName.id;
  if (lower === "good habits") return "good";
  if (lower === "bad habits") return "bad";
  return "good";
}

function inferLogType(
  logTypeRaw: string,
  value: number | null,
  count: number | null
): HabitType {
  const lt = logTypeRaw.trim().toLowerCase();
  if (lt === "checkbox" || lt === "binary") return "checkbox";
  if (lt === "duration") return "duration";
  if (lt === "number") return "number";
  if (value != null && (value > 1 || count == null)) return "number";
  if (count != null && count <= 1 && value == null) return "checkbox";
  return "number";
}

function valueFromImport(
  habit: HabitDefinition,
  value: number | null,
  count: number | null
): HabitValue | null {
  if (habit.type === "checkbox") {
    const n = count ?? value ?? 0;
    return { type: "checkbox", checked: n >= 1 };
  }
  if (habit.type === "duration") {
    const hours = value ?? count;
    if (hours == null) return null;
    const h = Math.floor(hours);
    const minutes = Math.round((hours - h) * 60);
    return {
      type: "duration",
      hours: Math.min(24, Math.max(0, h)),
      minutes: Math.min(59, Math.max(0, minutes)),
    };
  }
  const n = value ?? count;
  if (n == null) return null;
  return {
    type: "number",
    value: Math.min(1_000_000_000, Math.max(0, Math.trunc(n))),
  };
}

function duplicateKey(
  habitId: string,
  ymd: string,
  value: number | null,
  count: number | null
): string {
  const v = value ?? count ?? 0;
  return `${habitId}|${ymd}|${v}`;
}

function existingLogKey(
  values: ValuesByDate,
  habitId: string,
  ymd: string,
  habit: HabitDefinition
): string | null {
  const enc = values[ymd]?.[habitId];
  if (!enc) return null;
  let v = 0;
  if (enc.k === "n") v = enc.v;
  else if (enc.k === "c") v = enc.v ? 1 : 0;
  else if (enc.k === "d") v = enc.h + enc.m / 60;
  return duplicateKey(
    habitId,
    ymd,
    habit.type === "number" ? v : null,
    habit.type === "checkbox" ? v : null
  );
}

export function parseHabitLogsCsv(text: string): string[][] {
  return parseCsvText(text);
}

export function buildImportPreview(
  table: string[][],
  createMissingHabits: boolean
): ImportPreview {
  if (table.length < 2) {
    return {
      rows: [],
      totalRows: 0,
      ready: 0,
      warning: 0,
      error: 0,
      duplicates: 0,
    };
  }

  const headers = table[0];
  const defs = loadDefinitions();
  const values = loadValues();
  const seenKeys = new Set<string>();
  const existingKeys = new Set<string>();

  for (const [ymd, day] of Object.entries(values)) {
    if (!day) continue;
    for (const [hid] of Object.entries(day)) {
      const habit = defs.find((h) => h.id === hid);
      if (!habit) continue;
      const k = existingLogKey(values, hid, ymd, habit);
      if (k) existingKeys.add(k);
    }
  }

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < table.length; i++) {
    const rec = rowToRecord(headers, table[i]);
    const habitName = rec.habit_name ?? rec.habit ?? "";
    const habitIdRaw = rec.habit_id ?? "";
    const dateRaw = rec.date ?? "";
    const timeRaw = rec.time ?? "";
    const tsRaw = rec.timestamp ?? "";
    const ymdFromDate = parseDateToYmd(dateRaw);
    const timestamp = ymdFromDate
      ? buildTimestamp(ymdFromDate, timeRaw, tsRaw)
      : tsRaw
        ? buildTimestamp("", timeRaw, tsRaw)
        : null;
    const ymd =
      ymdFromDate ??
      (timestamp ? toYmd(new Date(timestamp)) : null) ??
      "";
    const value = parseNumber(rec.value ?? "");
    const count = parseNumber(rec.count ?? "");
    const unit = rec.unit ?? "";
    const comment = rec.comment ?? "";
    const sourceRaw = (rec.source ?? "manual").toLowerCase();
    const source: HabitLogSource =
      sourceRaw === "default" ? "default" : "manual";
    const logType = inferLogType(
      rec.log_type ?? "",
      value,
      count
    );
    const categoryInput = rec.category ?? "";

    let status: ImportRowStatus = "ready";
    let message = "";
    const resolvedHabit = findHabit(defs, habitIdRaw, habitName);

    if (!habitName.trim()) {
      status = "error";
      message = "habit_name is required";
    } else if (!ymd || !timestamp) {
      status = "error";
      message = "Valid date or timestamp required";
    } else if (!resolvedHabit && !createMissingHabits) {
      status = "warning";
      message = "No matching habit — enable “Create missing habits” or add habit first";
    } else if (!resolvedHabit && createMissingHabits) {
      status = "warning";
      message = "Will create new habit on import";
    } else if (resolvedHabit) {
      const val = valueFromImport(resolvedHabit, value, count);
      if (!val) {
        status = "error";
        message = "value or count required for this habit type";
      }
    }

    const hid = resolvedHabit?.id ?? (habitIdRaw || null);
    if (status === "ready" || status === "warning") {
      if (hid && ymd) {
        const dk = duplicateKey(hid, ymd, value, count);
        if (existingKeys.has(dk) || seenKeys.has(dk)) {
          status = "duplicate";
          message = "Duplicate log (same habit, time, value)";
        } else {
          seenKeys.add(dk);
        }
      }
    }

    const { h, m } = parseTimePart(timeRaw);
    rows.push({
      rowNumber: i + 1,
      habitName: habitName.trim(),
      habitId: hid,
      ymd,
      timestamp: timestamp ?? "",
      timeLabel: timeRaw || `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      value,
      count,
      unit,
      comment,
      source,
      logType,
      categoryInput,
      status,
      message,
    });
  }

  return {
    rows,
    totalRows: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    warning: rows.filter((r) => r.status === "warning").length,
    error: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
  };
}

export function executeHabitLogsImport(
  preview: ImportPreview,
  createMissingHabits: boolean
): ImportResult {
  let defs = loadDefinitions();
  let cats = ensureCategoryForHabits(loadCategories(), defs);
  let values = loadValues();

  let imported = 0;
  let skippedDuplicates = 0;
  let skippedErrors = 0;
  let habitsCreated = 0;
  let commentsAdded = 0;

  const nameToHabit = new Map(
    defs.map((h) => [h.name.trim().toLowerCase(), h])
  );

  for (const row of preview.rows) {
    if (row.status === "error") {
      skippedErrors++;
      continue;
    }
    if (row.status === "duplicate") {
      skippedDuplicates++;
      continue;
    }
    if (row.status === "warning" && !createMissingHabits) {
      skippedErrors++;
      continue;
    }

    let habit = row.habitId
      ? defs.find((h) => h.id === row.habitId) ?? null
      : null;
    if (!habit) {
      habit = nameToHabit.get(row.habitName.toLowerCase()) ?? null;
    }

    if (!habit && createMissingHabits) {
      const catId = resolveCategoryId(cats, row.categoryInput);
      const type = row.logType ?? inferLogType("", row.value, row.count);
      defs = appendDefinition(defs, {
        name: row.habitName,
        category: catId,
        type,
        unit: row.unit || undefined,
      });
      habit = defs[defs.length - 1];
      nameToHabit.set(row.habitName.toLowerCase(), habit);
      habitsCreated++;
      cats = ensureCategoryForHabits(cats, defs);
    }

    if (!habit) {
      skippedErrors++;
      continue;
    }

    const val = valueFromImport(habit, row.value, row.count);
    if (!val || !row.ymd) {
      skippedErrors++;
      continue;
    }

    const dk = duplicateKey(habit.id, row.ymd, row.value, row.count);
    const existing = existingLogKey(values, habit.id, row.ymd, habit);
    if (existing === dk) {
      skippedDuplicates++;
      continue;
    }

    values = setValueForHabit(values, row.ymd, habit, val, row.source);
    imported++;

    if (row.comment.trim()) {
      addHabitComment({
        id: newCommentId(),
        habitId: habit.id,
        habitName: habit.name,
        habitCategory: categoryLabel(cats, habit.category),
        createdAt: row.timestamp || new Date().toISOString(),
        text: row.comment.trim(),
        sentiment: "neutral",
      });
      commentsAdded++;
    }
  }

  saveDefinitions(defs);
  saveCategories(cats);
  saveValues(values);

  return {
    imported,
    skippedDuplicates,
    skippedErrors,
    habitsCreated,
    commentsAdded,
  };
}
