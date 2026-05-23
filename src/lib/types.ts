export type {
  HabitDefinition,
  HabitTarget,
  HabitDefaultValue,
  HabitDefaultApplyMode,
  HabitLogSource,
  HabitType,
  HabitValue,
  HabitCategoryId,
  TargetMode,
  TargetPeriod,
  DefaultCategoryId,
} from "@/lib/flexHabitTypes";

export type HabitComment = {
  id: string;
  habitId: string;
  habitName: string;
  habitCategory?: string;
  createdAt: string;
  updatedAt?: string;
  text: string;
  sentiment: "positive" | "negative" | "neutral";
};
export {
  DEFAULT_CATEGORY_IDS,
  CATEGORY_LABELS,
  CATEGORY_DEFAULT_OPEN,
  TYPE_LABELS,
  defaultValueFor,
  valueMatchesType,
} from "@/lib/flexHabitTypes";
