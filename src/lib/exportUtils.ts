import type { HabitDefinition, HabitLogSource } from "@/lib/flexHabitTypes";
import { loadCategories, categoryLabel, type FlexCategory } from "@/lib/categoryUtils";
import { getHabitComments } from "@/lib/commentStorage";
import {
  loadDefinitions,
  loadValues,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import {
  arrayToCsv,
  datedFilename,
  downloadCsv,
  downloadJson,
  formatDateForCsv,
  formatTimeForCsv,
} from "@/lib/csvUtils";

type EncodedValue =
  | { k: "c"; v: boolean; s?: "d" | "m" }
  | { k: "n"; v: number; s?: "d" | "m" }
  | { k: "d"; h: number; m: number; s?: "d" | "m" };

function habitMap(defs: HabitDefinition[]): Map<string, HabitDefinition> {
  return new Map(defs.map((h) => [h.id, h]));
}

function categoryName(cats: FlexCategory[], habit: HabitDefinition | undefined, categoryId: string): string {
  if (habit) return categoryLabel(cats, habit.category);
  const c = cats.find((x) => x.id === categoryId);
  return c?.name ?? categoryId;
}

function commentForDay(
  habitId: string,
  ymd: string
): string {
  const dayStart = new Date(`${ymd}T00:00:00`).getTime();
  const dayEnd = dayStart + 86400000;
  const match = getHabitComments().find((c) => {
    if (c.habitId !== habitId) return false;
    const t = new Date(c.createdAt).getTime();
    return t >= dayStart && t < dayEnd;
  });
  return match?.text ?? "";
}

function encodedToFields(
  enc: EncodedValue,
  habit: HabitDefinition | undefined
): {
  logType: string;
  value: string;
  unit: string;
  count: string;
} {
  const unit = habit?.unit ?? "";

  if (enc.k === "c") {
    return {
      logType: "checkbox",
      value: enc.v ? "1" : "0",
      unit: "",
      count: enc.v ? "1" : "0",
    };
  }
  if (enc.k === "n") {
    return {
      logType: "number",
      value: String(enc.v),
      unit,
      count: String(enc.v),
    };
  }
  const hours = enc.h + enc.m / 60;
  return {
    logType: "duration",
    value: String(hours),
    unit: "h",
    count: "",
  };
}

export function buildHabitLogsCsvRows(
  values: ValuesByDate = loadValues(),
  defs: HabitDefinition[] = loadDefinitions()
): string[][] {
  const cats = loadCategories();
  const byId = habitMap(defs);
  const headers = [
    "log_id",
    "date",
    "time",
    "timestamp",
    "habit_id",
    "habit_name",
    "category",
    "log_type",
    "value",
    "unit",
    "count",
    "source",
    "comment",
  ];
  const rows: string[][] = [headers];

  for (const [ymd, day] of Object.entries(values)) {
    if (!day) continue;
    for (const [habitId, enc] of Object.entries(day)) {
      const habit = byId.get(habitId);
      const ts = new Date(`${ymd}T12:00:00`).toISOString();
      const fields = encodedToFields(enc, habit);
      const source: HabitLogSource =
        enc.s === "d" ? "default" : "manual";
      rows.push([
        `${habitId}_${ymd}`,
        formatDateForCsv(ymd),
        "12:00",
        ts,
        habitId,
        habit?.name ?? habitId,
        categoryName(cats, habit, habit?.category ?? "good"),
        fields.logType,
        fields.value,
        fields.unit,
        fields.count,
        source,
        commentForDay(habitId, ymd),
      ]);
    }
  }

  rows.sort((a, b) => {
    const ta = a[3] ?? "";
    const tb = b[3] ?? "";
    return ta.localeCompare(tb);
  });

  return rows;
}

export function exportHabitLogsCsv(): void {
  const csv = arrayToCsv(buildHabitLogsCsvRows());
  downloadCsv(datedFilename("habit_logs", "csv"), csv);
}

export function exportHabitsCsv(): void {
  const defs = loadDefinitions();
  const headers = [
    "habit_id",
    "habit_name",
    "category",
    "habit_type",
    "unit",
    "target_value",
    "target_unit",
    "target_mode",
    "target_period",
    "default_enabled",
    "default_value",
    "default_unit",
    "default_apply_mode",
    "created_at",
  ];
  const cats = loadCategories();
  const rows: string[][] = [headers];

  for (const h of defs) {
    const t = h.target;
    const d = h.defaultValue;
    rows.push([
      h.id,
      h.name,
      categoryLabel(cats, h.category),
      h.type,
      h.unit ?? "",
      t ? String(t.value) : "",
      t?.unit ?? "",
      t?.mode ?? "",
      t?.period ?? "",
      d ? (d.enabled ? "true" : "false") : "",
      d ? String(d.value) : "",
      d?.unit ?? "",
      d?.applyMode ?? "",
      "",
    ]);
  }

  downloadCsv(datedFilename("habits", "csv"), arrayToCsv(rows));
}

export function exportCommentsCsv(): void {
  const cats = loadCategories();
  const defs = loadDefinitions();
  const byId = habitMap(defs);
  const headers = [
    "comment_id",
    "date",
    "time",
    "timestamp",
    "habit_id",
    "habit_name",
    "category",
    "sentiment",
    "text",
    "updated_at",
  ];
  const rows: string[][] = [headers];

  for (const c of getHabitComments()) {
    const habit = byId.get(c.habitId);
    rows.push([
      c.id,
      formatDateForCsv(c.createdAt),
      formatTimeForCsv(c.createdAt),
      c.createdAt,
      c.habitId,
      c.habitName,
      c.habitCategory ?? categoryName(cats, habit, habit?.category ?? ""),
      c.sentiment,
      c.text,
      c.updatedAt ?? "",
    ]);
  }

  downloadCsv(datedFilename("comments", "csv"), arrayToCsv(rows));
}

export function exportCategoriesCsv(): void {
  const headers = [
    "category_id",
    "category_name",
    "is_default",
    "created_at",
  ];
  const rows: string[][] = [headers];

  for (const c of loadCategories()) {
    rows.push([
      c.id,
      c.name,
      c.isDefault ? "true" : "false",
      c.createdAt,
    ]);
  }

  downloadCsv(datedFilename("categories", "csv"), arrayToCsv(rows));
}

export function buildAllDataBackup() {
  const values = loadValues();
  const logs = buildHabitLogsCsvRows(values)
    .slice(1)
    .map((r) => ({
      log_id: r[0],
      date: r[1],
      time: r[2],
      timestamp: r[3],
      habit_id: r[4],
      habit_name: r[5],
      category: r[6],
      log_type: r[7],
      value: r[8],
      unit: r[9],
      count: r[10],
      source: r[11],
      comment: r[12],
    }));

  return {
    exportedAt: new Date().toISOString(),
    habits: loadDefinitions(),
    logs,
    valuesByDate: values,
    comments: getHabitComments(),
    categories: loadCategories(),
  };
}

export function exportAllDataBackupJson(): void {
  downloadJson(datedFilename("all_data_backup", "json"), buildAllDataBackup());
}

export function getHabitLogsTemplateCsv(): string {
  const headers = [
    "date",
    "time",
    "habit_name",
    "value",
    "unit",
    "count",
    "comment",
    "source",
  ];
  const examples = [
    [
      "2026-05-23",
      "08:30",
      "Calories",
      "3000",
      "kcal",
      "",
      "Breakfast and dinner estimate",
      "manual",
    ],
    [
      "2026-05-23",
      "21:00",
      "Protein",
      "150",
      "g",
      "",
      "Hit protein goal",
      "manual",
    ],
    [
      "2026-05-23",
      "23:30",
      "Doom Scrolling",
      "",
      "",
      "2",
      "Late night scrolling",
      "manual",
    ],
  ];
  return arrayToCsv([headers, ...examples]);
}

export function downloadHabitLogsTemplate(): void {
  downloadCsv(datedFilename("habit_logs_template", "csv"), getHabitLogsTemplateCsv());
}
