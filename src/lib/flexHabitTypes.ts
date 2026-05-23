export type HabitType = "checkbox" | "number" | "duration";

/** Category id (built-in: good | health | binary | bad, or custom cat_…). */
export type HabitCategoryId = string;

export type TargetMode = "at_least" | "at_most" | "exact";
export type TargetPeriod = "daily" | "weekly";

export type HabitTarget = {
  value: number;
  unit?: string;
  mode: TargetMode;
  period: TargetPeriod;
};

export type HabitDefaultApplyMode =
  | "manual_fill"
  | "use_for_missing_graph_data";

export type HabitDefaultValue = {
  enabled: boolean;
  value: number;
  unit?: string;
  applyMode: HabitDefaultApplyMode;
};

export type HabitDefinition = {
  id: string;
  name: string;
  category: HabitCategoryId;
  type: HabitType;
  /** Shown after the input when set (e.g. kg, kcal, steps). */
  unit?: string;
  target?: HabitTarget;
  defaultValue?: HabitDefaultValue;
};

export type HabitLogSource = "manual" | "default";

export type HabitValue =
  | { type: "checkbox"; checked: boolean }
  | { type: "number"; value: number }
  | { type: "duration"; hours: number; minutes: number };

/** Built-in category ids (fixed order for dashboard). */
export const DEFAULT_CATEGORY_IDS = [
  "good",
  "health",
  "binary",
  "bad",
] as const;

export type DefaultCategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];

export const CATEGORY_LABELS: Record<DefaultCategoryId, string> = {
  good: "Good Habits",
  health: "Health",
  binary: "Binary",
  bad: "Bad Habits",
};

export const CATEGORY_DEFAULT_OPEN: Record<DefaultCategoryId, boolean> = {
  good: true,
  health: true,
  binary: false,
  bad: false,
};

export const TYPE_LABELS: Record<HabitType, string> = {
  checkbox: "Checkbox",
  number: "Number",
  duration: "Duration",
};

export function defaultValueFor(type: HabitType): HabitValue {
  switch (type) {
    case "checkbox":
      return { type: "checkbox", checked: false };
    case "number":
      return { type: "number", value: 0 };
    case "duration":
      return { type: "duration", hours: 0, minutes: 0 };
  }
}

export function valueMatchesType(v: HabitValue, type: HabitType): boolean {
  return v.type === type;
}
