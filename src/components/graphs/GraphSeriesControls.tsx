"use client";

import type { GymWorkoutKey } from "@/lib/flexHabitTypes";
import {
  GYM_WORKOUT_EXERCISES,
  GYM_WORKOUT_LABELS,
} from "@/lib/gymWorkouts";
import type { FiveKGraphMode } from "@/lib/habitScalar";
type GymProps = {
  variant: "gym";
  workout: GymWorkoutKey;
  exerciseId: string;
  onWorkoutChange: (w: GymWorkoutKey) => void;
  onExerciseChange: (id: string) => void;
};

type FiveKProps = {
  variant: "five_k";
  mode: FiveKGraphMode;
  onModeChange: (m: FiveKGraphMode) => void;
};

type Props = GymProps | FiveKProps;

const selectClass =
  "rounded-lg border border-[var(--foreground)]/12 bg-black/30 px-2 py-1 text-xs text-[var(--foreground)]";

export default function GraphSeriesControls(props: Props) {
  if (props.variant === "five_k") {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]/45">
          Plot
        </span>
        <select
          value={props.mode}
          onChange={(e) =>
            props.onModeChange(e.target.value as FiveKGraphMode)
          }
          className={selectClass}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="distance">Distance (km)</option>
          <option value="time">Time (h)</option>
        </select>
      </div>
    );
  }

  const exercises = GYM_WORKOUT_EXERCISES[props.workout] ?? [];

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={props.workout}
        onChange={(e) =>
          props.onWorkoutChange(e.target.value as GymWorkoutKey)
        }
        className={selectClass}
        aria-label="Workout type"
      >
        {(Object.keys(GYM_WORKOUT_LABELS) as GymWorkoutKey[]).map((k) => (
          <option key={k} value={k}>
            {GYM_WORKOUT_LABELS[k]}
          </option>
        ))}
      </select>
      <select
        value={props.exerciseId}
        onChange={(e) => props.onExerciseChange(e.target.value)}
        className={selectClass}
        aria-label="Exercise"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.label}
          </option>
        ))}
      </select>
    </div>
  );
}
