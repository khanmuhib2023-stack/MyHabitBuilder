/** Category id (built-in: study | health | islam, or custom cat_…). */
export type HabitCategoryId = string;

export type TargetMode = "at_least" | "at_most" | "exact";
export type TargetPeriod = "daily" | "weekly";

export type HabitTarget = {
  value: number;
  unit?: string;
  mode: TargetMode;
  period: TargetPeriod;
  /** Duration goal: optional hours (0–24). Minutes still in `value` as total minutes OR use with goalMinutes. */
  goalHours?: number;
  goalMinutes?: number;
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

export type HabitLogSource = "manual" | "default";

/** How values are captured in the UI. */
export type HabitType =
  | "checkbox"
  | "number"
  | "duration"
  | "gym"
  | "five_k"
  | "sleep_late";

/** Dispatch key for `scoringEngine` (matches Google Sheets formulas). */
export type HabitScoringKey =
  | "generic"
  | "study_time"
  | "steps"
  | "morning_routine"
  | "gym"
  | "five_k"
  | "sleep_late"
  | "calories"
  | "protein"
  | "creatine"
  | "bad_habit_rule_1"
  | "quran_study"
  | "prayer_rakats";

export type GymWorkoutKey =
  | "chest_back"
  | "biceps_triceps"
  | "legs_shoulders";

export type GymExerciseEntry = {
  /** Max weight or max reps depending on exercise. */
  value: number;
  /** At least 3 sets completed. */
  sets3Plus: boolean;
};

export type HabitValue =
  | { type: "checkbox"; checked: boolean }
  | { type: "number"; value: number; /** Empty / dash — not entered */ unset?: boolean }
  | { type: "duration"; hours: number; minutes: number }
  | {
      type: "gym";
      workout: GymWorkoutKey;
      exercises: Record<string, GymExerciseEntry>;
    }
  | {
      type: "five_k";
      distanceKm: number;
      hours: number;
      minutes: number;
    }
  | { type: "sleep_late"; hoursLate: number; minutesLate: number };

export type HabitDefinition = {
  id: string;
  name: string;
  category: HabitCategoryId;
  type: HabitType;
  unit?: string;
  target?: HabitTarget;
  defaultValue?: HabitDefaultValue;
  scoringKey?: HabitScoringKey;
  /** Extra config (e.g. fiveKGoalKm). Synced when Supabase `meta` exists. */
  meta?: Record<string, unknown>;
};

/** Built-in category ids (fixed order). */
export const DEFAULT_CATEGORY_IDS = ["study", "health", "islam"] as const;

export type DefaultCategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];

export const CATEGORY_LABELS: Record<DefaultCategoryId, string> = {
  study: "Study",
  health: "Health",
  islam: "Islam",
};

export const CATEGORY_DEFAULT_OPEN: Record<DefaultCategoryId, boolean> = {
  study: true,
  health: true,
  islam: false,
};

export const TYPE_LABELS: Record<HabitType, string> = {
  checkbox: "Checkbox",
  number: "Number",
  duration: "Duration",
  gym: "Gym tracker",
  five_k: "5K tracker",
  sleep_late: "Sleep (late to bed)",
};

export function defaultValueFor(type: HabitType): HabitValue {
  switch (type) {
    case "checkbox":
      return { type: "checkbox", checked: false };
    case "number":
      return { type: "number", value: 0 };
    case "duration":
      return { type: "duration", hours: 0, minutes: 0 };
    case "gym":
      return {
        type: "gym",
        workout: "chest_back",
        exercises: {},
      };
    case "five_k":
      return { type: "five_k", distanceKm: 0, hours: 0, minutes: 0 };
    case "sleep_late":
      return { type: "sleep_late", hoursLate: 0, minutesLate: 0 };
  }
}

export function valueMatchesType(v: HabitValue, type: HabitType): boolean {
  return v.type === type;
}
