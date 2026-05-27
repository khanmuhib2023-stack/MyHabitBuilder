import type {
  HabitDefinition,
  HabitScoringKey,
  HabitTarget,
  HabitValue,
} from "@/lib/flexHabitTypes";
import { hasStoredValueForHabit, type ValuesByDate } from "@/lib/flexHabitStorage";

const durationHours = (h: number, m: number) =>
  Math.max(0, h) + Math.max(0, m) / 60;

/** Map legacy scoring_key values from older app versions. */
const LEGACY_SCORING_KEY_MAP: Record<string, HabitScoringKey> = {
  study_duration: "study_time",
  quran: "quran_study",
  rule1: "bad_habit_rule_1",
  bad_occurrence: "bad_habit_rule_1",
  rakats: "prayer_rakats",
};

const CANONICAL_SCORING_KEYS: HabitScoringKey[] = [
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

export function normalizeScoringKey(
  key?: string | null
): HabitScoringKey {
  if (!key || typeof key !== "string") return "generic";
  const trimmed = key.trim();
  if (LEGACY_SCORING_KEY_MAP[trimmed]) return LEGACY_SCORING_KEY_MAP[trimmed];
  if ((CANONICAL_SCORING_KEYS as string[]).includes(trimmed)) {
    return trimmed as HabitScoringKey;
  }
  return "generic";
}

function effectiveScoringKey(habit: HabitDefinition): HabitScoringKey {
  const k = normalizeScoringKey(habit.scoringKey);
  if (k !== "generic") return k;
  if (habit.type === "duration" && habit.category === "study") {
    return "study_time";
  }
  if (habit.type === "duration" && habit.category === "islam") {
    return "quran_study";
  }
  return "generic";
}

function targetFrom(
  habit: HabitDefinition,
  override?: HabitTarget | null
): HabitTarget | undefined {
  return override !== undefined ? override ?? undefined : habit.target;
}

function getGoalNumber(
  habit: HabitDefinition,
  target?: HabitTarget | null
): number | null {
  const t = targetFrom(habit, target);
  const v = t?.value;
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

function fiveKGoalKm(habit: HabitDefinition): number {
  const m = habit.meta?.fiveKGoalKm;
  if (typeof m === "number" && Number.isFinite(m) && m > 0) return m;
  return 5;
}

function numberUnset(v: HabitValue): boolean {
  return v.type === "number" && Boolean(v.unset);
}

function numberValue(v: HabitValue): number {
  return v.type === "number" ? v.value : 0;
}

export function studyTimeScore(hours: number, minutes: number): number {
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

/** Score when a gym log exists for the day. */
export function gymScore(v: HabitValue): number | null {
  if (v.type !== "gym") return null;
  const n = gymCompletedCount(v);
  if (n === 0) return -5;
  return 6 * n;
}

export function fiveKScore(
  habit: HabitDefinition,
  distanceKm: number,
  hasStored: boolean
): number | null {
  if (!hasStored) return -25;
  const goal = fiveKGoalKm(habit);
  if (distanceKm >= goal) return 15;
  return -15 * ((goal - distanceKm) / goal);
}

export function sleepLateScore(hoursLate: number, minutesLate: number): number {
  const totalLateMinutes =
    Math.max(0, hoursLate) * 60 + Math.max(0, minutesLate);
  if (totalLateMinutes === 0) return 10;
  return -10 * Math.ceil(totalLateMinutes / 10);
}

export function caloriesScore(
  habit: HabitDefinition,
  v: HabitValue,
  target?: HabitTarget | null
): number | null {
  const goal = getGoalNumber(habit, target);
  if (goal == null) return null;
  if (numberUnset(v)) return -20;
  const n = numberValue(v);
  if (n === 0) return -50;
  if (n <= goal) return (goal - n) / 20;
  return -(n - goal) / 10;
}

export function proteinScore(
  habit: HabitDefinition,
  v: HabitValue,
  target?: HabitTarget | null
): number | null {
  const goal = getGoalNumber(habit, target);
  if (goal == null) return null;
  if (numberUnset(v)) return -20;
  const n = numberValue(v);
  if (!Number.isFinite(n)) return -20;
  if (n === goal) return 10;
  if (n < goal) return -5 * Math.ceil((goal - n) / 10);
  return 10 + 5 * Math.floor((n - goal) / 10);
}

export function creatineScore(grams: number): number {
  if (grams === 0) return -5;
  return grams * 3;
}

export function badHabitRule1Score(v: number): number {
  if (v === 0) return 15;
  return -20 * v;
}

export function quranStudyScore(hours: number, minutes: number): number {
  const hrs = durationHours(hours, minutes);
  if (hrs === 0) return -10;
  return hrs * 15;
}

export function prayerRakatsScore(n: number): number {
  if (n === 0) return -10;
  return 1.8 * n;
}

export type CalculateHabitScoreOptions = {
  target?: HabitTarget | null;
  /** False when no log row exists for that date (required for 5K / gym). */
  hasStored?: boolean;
};

/**
 * Central scoring entry: uses `habit.scoring_key` (with legacy aliases).
 * `logPayload` is the structured habit value for that day.
 */
export function calculateHabitScore(
  habit: HabitDefinition,
  logPayload: HabitValue,
  options?: CalculateHabitScoreOptions
): number | null {
  const key = effectiveScoringKey(habit);
  const hasStored = options?.hasStored ?? true;
  const target = options?.target;

  switch (key) {
    case "study_time":
      return logPayload.type === "duration"
        ? studyTimeScore(logPayload.hours, logPayload.minutes)
        : null;
    case "steps":
      return logPayload.type === "number"
        ? stepsScore(logPayload.value, getGoalNumber(habit, target))
        : null;
    case "morning_routine":
      return logPayload.type === "number"
        ? morningRoutineScore(logPayload.value)
        : null;
    case "gym":
      if (!hasStored) return null;
      return gymScore(logPayload);
    case "five_k":
      if (logPayload.type !== "five_k") return -25;
      return fiveKScore(habit, logPayload.distanceKm, hasStored);
    case "sleep_late":
      return logPayload.type === "sleep_late"
        ? sleepLateScore(logPayload.hoursLate, logPayload.minutesLate)
        : null;
    case "calories":
      return caloriesScore(habit, logPayload, target);
    case "protein":
      return proteinScore(habit, logPayload, target);
    case "creatine":
      return logPayload.type === "number"
        ? creatineScore(logPayload.value)
        : null;
    case "bad_habit_rule_1":
      return logPayload.type === "number"
        ? badHabitRule1Score(logPayload.value)
        : null;
    case "quran_study":
      return logPayload.type === "duration"
        ? quranStudyScore(logPayload.hours, logPayload.minutes)
        : null;
    case "prayer_rakats":
      return logPayload.type === "number"
        ? prayerRakatsScore(logPayload.value)
        : null;
    default:
      return null;
  }
}

/** @deprecated Use calculateHabitScore */
export function computeDailyScore(
  habit: HabitDefinition,
  value: HabitValue,
  options?: CalculateHabitScoreOptions
): number | null {
  return calculateHabitScore(habit, value, options);
}

export function calculateHabitScoreForDate(
  habit: HabitDefinition,
  values: ValuesByDate,
  ymd: string,
  value: HabitValue
): number | null {
  const hasStored = hasStoredValueForHabit(values, ymd, habit.id);
  return calculateHabitScore(habit, value, { hasStored });
}

/** Short human-readable scoring hint for overflow menu. */
export function scoringSummaryLine(habit: HabitDefinition): string {
  const k = effectiveScoringKey(habit);
  const lines: Record<HabitScoringKey, string> = {
    study_time: "0h → −10. Else (hours + min/60) × 12.5.",
    steps: "≥ goal → +15. Below → −50×(gap/goal).",
    morning_routine: "0 → −10. Else value × 5.",
    gym: "3+ sets ticked per exercise: +6 each. Logged, none ticked → −5.",
    five_k: "No log → −25. Distance vs goal km formula.",
    sleep_late: "On time → +10. Else −10 per 10 min late (ceiling).",
    calories: "Blank → −20, 0 → −50, else vs at-most goal.",
    protein: "Blank → −20; at/below/above target bands.",
    creatine: "0 g → −5; else grams × 3.",
    bad_habit_rule_1: "0 → +15; each occurrence −20.",
    quran_study: "0h → −10; else (hours + min/60) × 15.",
    prayer_rakats: "0 → −10; else 1.8 × rakats.",
    generic: "Set a scoring preset in habit settings.",
  };
  return lines[k] ?? lines.generic;
}

/** Dev self-check against spreadsheet examples (throws on mismatch). */
export function assertScoringTestCases(): void {
  const habit = (scoringKey: HabitScoringKey, partial?: Partial<HabitDefinition>) =>
    ({
      id: "t",
      name: "T",
      category: "health",
      type: "number",
      scoringKey,
      ...partial,
    }) as HabitDefinition;

  const eq = (a: number | null, b: number | null, label: string) => {
    if (a === null || b === null ? a !== b : Math.abs(a - b) > 1e-9) {
      throw new Error(`${label}: expected ${b}, got ${a}`);
    }
  };

  eq(studyTimeScore(0, 0), -10, "study 0");
  eq(studyTimeScore(1, 0), 12.5, "study 1h");
  eq(studyTimeScore(2, 30), 31.25, "study 2h30");

  const stepsH = habit("steps", {
    target: { value: 10000, mode: "at_least", period: "daily" },
  });
  eq(
    calculateHabitScore(stepsH, { type: "number", value: 10000 }),
    15,
    "steps 10k"
  );
  eq(
    calculateHabitScore(stepsH, { type: "number", value: 5000 }),
    -25,
    "steps 5k"
  );
  eq(
    calculateHabitScore(stepsH, { type: "number", value: 0 }),
    -50,
    "steps 0"
  );

  eq(morningRoutineScore(0), -10, "mr 0");
  eq(morningRoutineScore(1), 5, "mr 1");
  eq(morningRoutineScore(2), 10, "mr 2");
  eq(morningRoutineScore(3), 15, "mr 3");

  const gymVal = (ticks: number): HabitValue => ({
    type: "gym",
    workout: "chest_back",
    exercises: Object.fromEntries(
      Array.from({ length: ticks }, (_, i) => [
        `e${i}`,
        { value: 50, sets3Plus: true },
      ])
    ),
  });
  eq(gymScore(gymVal(0)), -5, "gym 0");
  eq(gymScore(gymVal(1)), 6, "gym 1");
  eq(gymScore(gymVal(3)), 18, "gym 3");
  eq(gymScore(gymVal(6)), 36, "gym 6");

  const fiveH = habit("five_k", { type: "five_k", meta: { fiveKGoalKm: 5 } });
  eq(
    calculateHabitScore(
      fiveH,
      { type: "five_k", distanceKm: 0, hours: 0, minutes: 0 },
      { hasStored: false }
    ),
    -25,
    "5k none"
  );
  eq(
    calculateHabitScore(
      fiveH,
      { type: "five_k", distanceKm: 5, hours: 0, minutes: 0 },
      { hasStored: true }
    ),
    15,
    "5k 5km"
  );
  eq(
    calculateHabitScore(
      fiveH,
      { type: "five_k", distanceKm: 2.5, hours: 0, minutes: 0 },
      { hasStored: true }
    ),
    -7.5,
    "5k 2.5"
  );

  eq(sleepLateScore(0, 0), 10, "sleep 0");
  eq(sleepLateScore(0, 10), -10, "sleep 10m");
  eq(sleepLateScore(0, 20), -20, "sleep 20m");
  eq(sleepLateScore(0, 45), -50, "sleep 45m");

  const calH = habit("calories", {
    type: "number",
    target: { value: 2000, mode: "at_most", period: "daily" },
  });
  eq(
    calculateHabitScore(calH, { type: "number", value: 0, unset: true }),
    -20,
    "cal blank"
  );
  eq(calculateHabitScore(calH, { type: "number", value: 0 }), -50, "cal 0");
  eq(calculateHabitScore(calH, { type: "number", value: 1800 }), 10, "cal 1800");
  eq(calculateHabitScore(calH, { type: "number", value: 2000 }), 0, "cal 2000");
  eq(calculateHabitScore(calH, { type: "number", value: 2200 }), -20, "cal 2200");
  eq(calculateHabitScore(calH, { type: "number", value: 3000 }), -100, "cal 3000");

  const proH = habit("protein", {
    type: "number",
    target: { value: 150, mode: "at_least", period: "daily" },
  });
  eq(
    calculateHabitScore(proH, { type: "number", value: 0, unset: true }),
    -20,
    "pro blank"
  );
  eq(calculateHabitScore(proH, { type: "number", value: 150 }), 10, "pro 150");
  eq(calculateHabitScore(proH, { type: "number", value: 140 }), -5, "pro 140");
  eq(calculateHabitScore(proH, { type: "number", value: 130 }), -10, "pro 130");
  eq(calculateHabitScore(proH, { type: "number", value: 160 }), 15, "pro 160");
  eq(calculateHabitScore(proH, { type: "number", value: 170 }), 20, "pro 170");

  eq(creatineScore(0), -5, "creatine 0");
  eq(creatineScore(5), 15, "creatine 5");

  eq(badHabitRule1Score(0), 15, "rule 0");
  eq(badHabitRule1Score(1), -20, "rule 1");
  eq(badHabitRule1Score(2), -40, "rule 2");

  eq(quranStudyScore(0, 0), -10, "quran 0");
  eq(quranStudyScore(1, 0), 15, "quran 1h");
  eq(quranStudyScore(2, 0), 30, "quran 2h");

  eq(prayerRakatsScore(0), -10, "prayer 0");
  eq(prayerRakatsScore(10), 18, "prayer 10");
}
