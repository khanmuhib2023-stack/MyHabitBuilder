import type { HabitDefinition } from "@/lib/flexHabitTypes";
import {
  deleteCustomCategory,
  loadCategories,
  type FlexCategory,
} from "@/lib/categoryUtils";
import { loadDefinitions, saveDefinitions } from "@/lib/flexHabitStorage";

export type RemoveCategoryResult = {
  ok: boolean;
  error?: string;
  nextCategories?: FlexCategory[];
  nextHabits?: HabitDefinition[];
};

/** Remove a category; optionally move its habits first. Never deletes habits or logs. */
export function removeCategory(
  categoryId: string,
  moveHabitsToId?: string
): RemoveCategoryResult {
  const categories = loadCategories();
  const habits = loadDefinitions();
  const r = deleteCustomCategory(categories, categoryId, habits, moveHabitsToId);

  if (r.error) {
    return { ok: false, error: r.error };
  }

  if (r.nextHabits !== habits) {
    saveDefinitions(r.nextHabits);
  }

  return {
    ok: true,
    nextCategories: r.nextCategories,
    nextHabits: r.nextHabits,
  };
}

export function habitCountInCategory(
  habits: HabitDefinition[],
  categoryId: string
): number {
  return habits.filter((h) => h.category === categoryId).length;
}
