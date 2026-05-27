import type {
  HabitDefinition,
  HabitScoringKey,
  HabitValue,
} from "@/lib/flexHabitTypes";

const durationHours = (h: number, m: number) =>
  Math.max(0, h) + Math.max(0, m) / 60;

function scoringKeyOf(habit: HabitDefinition): HabitScoringKey {
  return habit.scoringKey ?? "generic";
}

function getGoalNumber(habit: HabitDefinition): number | null {
  const v = habit.target?.value;
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

function fiveKGoalKm(habit: HabitDefinition): number {
  const m = habit.meta?.fiveKGoalKm;
  if (typeof m === "number" && Number.isFinite(m) && m > 0) return m;
  return 5;
}

/** Calories / protein: TRIM empty, dash em/en → treat as unset. */
function numberUnset(v: HabitValue): boolean {
  return v.type === "number" && Boolean(v.unset);
}

function numberValue(v: HabitValue): number {
  return v.type === "number" ? v.value : 0;
}

export function studyDurationScore(hours: number, minutes: number): number {
  const hrs = durationHours(hours, minutes);
  if (hrs === 0) return -10;
  return hrs * 12.5;
}

export function stepsScore(actual: number, goal: number | null): number | null {
  if (goal == null || goal <= 0) return null;
  if (actual >= goal) return 15;
  return -50 * ((goal - actual) / goal);
}

export function morningRoutineScore(v: number): number {
  if (v === 0) return -10;
  return v * 5;
}

export function gymCompletedCount(v: HabitValue): number {
  if (v.type !== "gym") return 0;
  let n = 0;
  for (const ex of Object.values(v.exercises)) {
    if (ex.sets3Plus) n += 1;
  }
  return n;
}

/** null = no log row (blank score). */
export function gymScore(v: HabitValue | null): number | null {
  if (v == null) return null;
  if (v.type !== "gym") return null;
  const n = gymCompletedCount(v);
  const hasAnyInput = Object.values(v.exercises).some(
    (ex) => ex.value > 0 || ex.sets3Plus
  );
  if (!hasAnyInput && n === 0) return -5;
  if (n === 0) return -5;
  return 6 * n;
}

export function fiveKScore(
  habit: HabitDefinition,
  distanceKm: number,
  logged: boolean
): number | null {
  if (!logged) return -25;
  const goal = fiveKGoalKm(habit);
  if (distanceKm >= goal) return 15;
  return -15 * ((goal - distanceKm) / goal);
}

export function sleepLateScore(hoursLate: number, minutesLate: number): number {
  const L = Math.max(0, hoursLate) * 60 + Math.max(0, minutesLate);
  return 10 - L;
}

export function caloriesScore(
  habit: HabitDefinition,
  v: HabitValue
): number | null {
  const target = getGoalNumber(habit);
  if (target == null) return null;
  if (numberUnset(v)) return -20;
  const n = numberValue(v);
  if (n === 0) return -50;
  if (n <= target) return (target - n) / 20;
  return -(n - target) / 10;
}

export function proteinScore(
  habit: HabitDefinition,
  v: HabitValue
): number | null {
  const target = getGoalNumber(habit);
  if (target == null) return null;
  if (numberUnset(v)) return -20;
  const n = numberValue(v);
  if (n === target) return 10;
  if (n < target) {
    return -5 * Math.ceil((target - n) / 10);
  }
  return 10 + 5 * Math.floor((n - target) / 10);
}

export function creatineScore(grams: number): number {
  if (grams === 0) return -5;
  return grams * 3;
}

export function rule1Score(v: number): number {
  if (v === 0) return 15;
  return -20 * v;
}

export function quranScore(hours: number, minutes: number): number {
  const hrs = durationHours(hours, minutes);
  if (hrs === 0) return -10;
  return hrs * 15;
}

export function rakatsScore(n: number): number {
  if (n === 0) return -10;
  return 1.8 * n;
}

export function genericNumberScore(
  habit: HabitDefinition,
  v: HabitValue
): number | null {
  if (v.type !== "number") return null;
  return v.value;
}

/**
 * Daily score for a habit value.
 * `null` means “no score” (e.g. gym not logged).
 */
export function computeDailyScore(
  habit: HabitDefinition,
  value: HabitValue
): number | null {
  const key = scoringKeyOf(habit);
  switch (key) {
    case "study_duration":
    case "generic":
      if (value.type === "duration")
        return studyDurationScore(value.hours, value.minutes);
      if (value.type === "number") return value.value;
      return null;
    case "steps":
      return value.type === "number"
        ? stepsScore(value.value, getGoalNumber(habit))
        : null;
    case "morning_routine":
      return value.type === "number" ? morningRoutineScore(value.value) : null;
    case "gym":
      return gymScore(value);
    case "five_k":
      if (value.type !== "five_k") return -25;
      const logged =
        value.distanceKm > 0 || value.hours > 0 || value.minutes > 0;
      return fiveKScore(habit, value.distanceKm, logged);
    case "sleep_late":
      return value.type === "sleep_late"
        ? sleepLateScore(value.hoursLate, value.minutesLate)
        : null;
    case "calories":
      return caloriesScore(habit, value);
    case "protein":
      return proteinScore(habit, value);
    case "creatine":
      return value.type === "number" ? creatineScore(value.value) : null;
    case "rule1":
    case "bad_occurrence":
      return value.type === "number" ? rule1Score(value.value) : null;
    case "quran":
      return value.type === "duration"
        ? quranScore(value.hours, value.minutes)
        : null;
    case "rakats":
      return value.type === "number" ? rakatsScore(value.value) : null;
    default:
      return null;
  }
}

/** Short human-readable scoring hint for overflow menu. */
export function scoringSummaryLine(habit: HabitDefinition): string {
  const k = scoringKeyOf(habit);
  const lines: Record<HabitScoringKey, string> = {
    study_duration: "0h → −10 pts. Else hours×12.5 (+ minutes/60×12.5).",
    steps: "Meet goal → +15. Below goal → −50×(gap/goal).",
    morning_routine: "0 → −10. Else value×5.",
    gym: "Per exercise with 3+ sets: +6 each. Logged but none → −5.",
    five_k: "Not logged → −25. Distance vs goal km → ± formula.",
    sleep_late: "On time (0 late) → +10. Then −1 pt per minute late (10 min = 0).",
    calories: "Empty → −20, 0 kcal → −50, else vs target formula.",
    protein: "Empty → −20; vs target bands (+/− by 10g).",
    creatine: "0 g → −5; else grams×3.",
    rule1: "0 occurrences → +15; each occurrence −20.",
    bad_occurrence: "0 → +15; each −20.",
    quran: "0 study time → −10; else hours×15 (+ minutes).",
    rakats: "0 → −10; else 1.8× rakats.",
    generic: "See goal / graph settings.",
  };
  return lines[k] ?? lines.generic;
}
