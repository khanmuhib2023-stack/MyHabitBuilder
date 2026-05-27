import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";
import { gymCompletedCount } from "@/lib/scoringEngine";
import { durationToDecimalHours } from "@/lib/durationFormat";

export type FiveKGraphMode = "distance" | "time";

/** Single number for charts / summaries. */
export function habitValueToScalar(
  habit: HabitDefinition,
  value: HabitValue,
  opts?: { fiveKMode?: FiveKGraphMode }
): number | null {
  switch (value.type) {
    case "checkbox":
      return value.checked ? 1 : 0;
    case "number":
      if (value.unset) return null;
      return value.value;
    case "duration":
      return durationToDecimalHours(value.hours, value.minutes);
    case "gym":
      return gymCompletedCount(value);
    case "five_k": {
      const mode = opts?.fiveKMode ?? "distance";
      if (mode === "distance") return value.distanceKm;
      return durationToDecimalHours(value.hours, value.minutes);
    }
    case "sleep_late":
      return value.hoursLate * 60 + value.minutesLate;
    default:
      return null;
  }
}

export function isGymHabit(habit: HabitDefinition): boolean {
  return habit.type === "gym" || habit.scoringKey === "gym";
}

export function isFiveKHabit(habit: HabitDefinition): boolean {
  return habit.type === "five_k" || habit.scoringKey === "five_k";
}
