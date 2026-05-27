import type { GymWorkoutKey } from "@/lib/flexHabitTypes";

/** Exercise id → label (value = max weight or max reps; assisted pull-up = min assisted weight). */
export const GYM_WORKOUT_EXERCISES: Record<
  GymWorkoutKey,
  { id: string; label: string; valueLabel: string }[]
> = {
  chest_back: [
    { id: "bench_press", label: "Bench Press", valueLabel: "Max weight" },
    { id: "pec_fly", label: "Pec Fly", valueLabel: "Max weight" },
    { id: "abs", label: "Abs exercise", valueLabel: "Max reps" },
    {
      id: "assisted_pullup",
      label: "Assisted Pull Up",
      valueLabel: "Min assisted weight",
    },
    { id: "lat_pulldown", label: "Lat Pulldown", valueLabel: "Max weight" },
    { id: "face_pulls", label: "Face Pulls", valueLabel: "Max weight" },
  ],
  biceps_triceps: [
    { id: "preacher_curls", label: "Preacher Curls", valueLabel: "Max weight" },
    { id: "cable_curls", label: "Cable Curls", valueLabel: "Max weight" },
    {
      id: "triceps_cable",
      label: "Triceps Cable Pull",
      valueLabel: "Max weight",
    },
    {
      id: "overhead_tricep",
      label: "Overhead Tricep Pulls",
      valueLabel: "Max weight",
    },
    { id: "abs_bt", label: "Abs Exercise", valueLabel: "Max reps" },
    { id: "dips", label: "Dips", valueLabel: "Max reps" },
  ],
  legs_shoulders: [
    { id: "shoulder_press", label: "Shoulder Press", valueLabel: "Max weight" },
    { id: "quad_ext", label: "Quad Extension", valueLabel: "Max weight" },
    {
      id: "hamstring_curls",
      label: "Lying Hamstring Curls",
      valueLabel: "Max weight",
    },
    { id: "leg_press", label: "Leg Press", valueLabel: "Max weight" },
    { id: "abs_ls", label: "Abs Exercise", valueLabel: "Max reps" },
  ],
};

export const GYM_WORKOUT_LABELS: Record<GymWorkoutKey, string> = {
  chest_back: "Chest and Back",
  biceps_triceps: "Biceps and Triceps",
  legs_shoulders: "Legs and Shoulders",
};
