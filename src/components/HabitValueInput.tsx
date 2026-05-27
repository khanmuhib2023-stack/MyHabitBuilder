"use client";

import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";
import { GYM_WORKOUT_EXERCISES, GYM_WORKOUT_LABELS } from "@/lib/gymWorkouts";
import type { GymWorkoutKey } from "@/lib/flexHabitTypes";
const inputClass = "rounded-lg px-2.5 py-1.5 text-sm tabular-nums ui-input w-full min-w-0";

type Props = {
  habit: HabitDefinition;
  value: HabitValue;
  onChange: (next: HabitValue) => void;
};

export default function HabitValueInput({ habit, value, onChange }: Props) {
  if (habit.type === "checkbox" && value.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.checked}
          onChange={(e) =>
            onChange({ type: "checkbox", checked: e.target.checked })
          }
          className="size-5 rounded border-[var(--foreground)]/25 accent-[var(--foreground)]"
        />
        <span className="text-[var(--foreground)]/55">Done</span>
      </label>
    );
  }

  if (habit.type === "number" && value.type === "number") {
    const allowDash =
      habit.scoringKey === "calories" || habit.scoringKey === "protein";
    const display = value.unset
      ? ""
      : value.value === 0 && !allowDash
        ? ""
        : String(value.value);
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder={allowDash ? "—" : "0"}
          value={display}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (allowDash && (raw === "" || /^[-–—]$/.test(raw))) {
              onChange({ type: "number", value: 0, unset: true });
              return;
            }
            const n = Number(raw);
            const v = Number.isFinite(n)
              ? Math.min(1_000_000_000, Math.max(0, Math.trunc(n)))
              : 0;
            onChange({ type: "number", value: v, unset: false });
          }}
          className={`${inputClass} max-w-[8rem]`}
        />
        {habit.unit ? (
          <span className="text-xs text-[var(--foreground)]/45">{habit.unit}</span>
        ) : null}
      </div>
    );
  }

  if (
    (habit.type === "duration" || habit.type === "sleep_late") &&
    (value.type === "duration" || value.type === "sleep_late")
  ) {
    const hours =
      value.type === "duration" ? value.hours : value.hoursLate;
    const minutes =
      value.type === "duration" ? value.minutes : value.minutesLate;
    const patch = (h: number, m: number) => {
      if (value.type === "duration") {
        onChange({ type: "duration", hours: h, minutes: m });
      } else {
        onChange({ type: "sleep_late", hoursLate: h, minutesLate: m });
      }
    };
  const setH = (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      const h = Number.isFinite(n)
        ? Math.min(24, Math.max(0, Math.trunc(n)))
        : 0;
      patch(h, minutes);
    };
    const setM = (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      const m = Number.isFinite(n)
        ? Math.min(59, Math.max(0, Math.trunc(n)))
        : 0;
      patch(hours, m);
    };
    const lateLabel = value.type === "sleep_late";
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1 text-[var(--foreground)]/50">
          {lateLabel ? "h late" : "h"}
          <input
            type="number"
            min={0}
            max={24}
            value={hours === 0 ? "" : hours}
            onChange={(e) => setH(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>
        <label className="flex items-center gap-1 text-[var(--foreground)]/50">
          {lateLabel ? "m late" : "m"}
          <input
            type="number"
            min={0}
            max={59}
            value={minutes === 0 ? "" : minutes}
            onChange={(e) => setM(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>
      </div>
    );
  }

  if (habit.type === "gym" && value.type === "gym") {
    const exercises = GYM_WORKOUT_EXERCISES[value.workout] ?? [];
    const updateEx = (
      exId: string,
      patch: Partial<{ value: number; sets3Plus: boolean }>
    ) => {
      const cur = value.exercises[exId] ?? { value: 0, sets3Plus: false };
      const nextVal = patch.value ?? cur.value;
      const nextSets =
        patch.sets3Plus !== undefined ? patch.sets3Plus : cur.sets3Plus;
      const autoSets = nextVal > 0 ? true : nextSets;
      onChange({
        type: "gym",
        workout: value.workout,
        exercises: {
          ...value.exercises,
          [exId]: {
            value: nextVal,
            sets3Plus: patch.sets3Plus !== undefined ? nextSets : autoSets,
          },
        },
      });
    };
    return (
      <div className="w-full space-y-3">
        <select
          value={value.workout}
          onChange={(e) =>
            onChange({
              type: "gym",
              workout: e.target.value as GymWorkoutKey,
              exercises: {},
            })
          }
          className={inputClass}
        >
          {(Object.keys(GYM_WORKOUT_LABELS) as GymWorkoutKey[]).map((k) => (
            <option key={k} value={k}>
              {GYM_WORKOUT_LABELS[k]}
            </option>
          ))}
        </select>
        <ul className="space-y-2">
          {exercises.map((ex) => {
            const row = value.exercises[ex.id] ?? {
              value: 0,
              sets3Plus: false,
            };
            return (
              <li
                key={ex.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--foreground)]/8 bg-black/20 px-2 py-2"
              >
                <span className="min-w-[7rem] flex-1 text-xs font-medium text-[var(--foreground)]/80">
                  {ex.label}
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder={ex.valueLabel}
                  value={row.value === 0 ? "" : row.value}
                  onChange={(e) => {
                    const n = e.target.value === "" ? 0 : Number(e.target.value);
                    updateEx(ex.id, {
                      value: Number.isFinite(n) ? Math.max(0, n) : 0,
                    });
                  }}
                  className={`${inputClass} max-w-[5rem]`}
                />
                <label className="flex items-center gap-1 text-[10px] text-[var(--foreground)]/45">
                  <input
                    type="checkbox"
                    checked={row.sets3Plus}
                    onChange={(e) =>
                      updateEx(ex.id, { sets3Plus: e.target.checked })
                    }
                    className="size-3.5"
                  />
                  3+ sets
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (habit.type === "five_k" && value.type === "five_k") {
    const setKm = (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      onChange({
        ...value,
        distanceKm: Number.isFinite(n) ? Math.max(0, n) : 0,
      });
    };
    const setH = (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      onChange({
        ...value,
        hours: Number.isFinite(n)
          ? Math.min(24, Math.max(0, Math.trunc(n)))
          : 0,
      });
    };
    const setM = (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      onChange({
        ...value,
        minutes: Number.isFinite(n)
          ? Math.min(59, Math.max(0, Math.trunc(n)))
          : 0,
      });
    };
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1 text-[var(--foreground)]/50">
          km
          <input
            type="number"
            min={0}
            step={0.1}
            value={value.distanceKm === 0 ? "" : value.distanceKm}
            onChange={(e) => setKm(e.target.value)}
            className={`${inputClass} w-16`}
          />
        </label>
        <label className="flex items-center gap-1 text-[var(--foreground)]/50">
          h
          <input
            type="number"
            min={0}
            max={24}
            value={value.hours === 0 ? "" : value.hours}
            onChange={(e) => setH(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>
        <label className="flex items-center gap-1 text-[var(--foreground)]/50">
          m
          <input
            type="number"
            min={0}
            max={59}
            value={value.minutes === 0 ? "" : value.minutes}
            onChange={(e) => setM(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>
      </div>
    );
  }

  return (
    <p className="text-xs text-[var(--foreground)]/45">Unsupported habit type.</p>
  );
}
