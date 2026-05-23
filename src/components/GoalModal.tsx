"use client";

import { useEffect, useId, useState } from "react";
import type { HabitDefinition, HabitTarget } from "@/lib/flexHabitTypes";
import { TYPE_LABELS } from "@/lib/flexHabitTypes";
import { isBadOccurrenceHabit } from "@/lib/graphUtils";
import { labelClass, modalOverlay, selectClass, ui } from "@/lib/uiClasses";

type Props = {
  habit: HabitDefinition;
  onClose: () => void;
  onSave: (target: HabitTarget | undefined) => void;
};

export default function GoalModal({ habit, onClose, onSave }: Props) {
  const titleId = useId();
  const existing = habit.target;
  const [value, setValue] = useState(
    existing?.value != null
      ? String(existing.value)
      : isBadOccurrenceHabit(habit)
        ? "0"
        : habit.type === "checkbox"
          ? "1"
          : ""
  );
  const [unit, setUnit] = useState(
    existing?.unit ?? habit.unit ?? ""
  );
  const [mode, setMode] = useState<HabitTarget["mode"]>(
    existing?.mode ??
      (isBadOccurrenceHabit(habit)
        ? "at_most"
        : habit.type === "checkbox"
          ? "exact"
          : "at_least")
  );
  const [period, setPeriod] = useState<HabitTarget["period"]>(
    existing?.period ?? "daily"
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const t: HabitTarget = {
        value: habit.type === "checkbox" ? Math.min(1, Math.max(0, Math.round(n))) : n,
        mode,
        period,
        unit: unit.trim() || habit.unit || undefined,
      };
    onSave(t);
    onClose();
  };

  const clear = () => {
    onSave(undefined);
    onClose();
  };

  return (
    <div className={modalOverlay}>
      <div
        className={`absolute inset-0 ${ui.modalBackdrop}`}
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 ${ui.modalPanel}`}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Goal · {habit.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground)]/55">
          {TYPE_LABELS[habit.type]} habit — set an optional target to compare on
          graphs.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="goal-value" className={labelClass}>
              Target value
            </label>
            <input
              id="goal-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              className={selectClass}
            />
          </div>
          <div>
            <label htmlFor="goal-unit" className={labelClass}>
              Unit (optional)
            </label>
            <input
              id="goal-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={habit.type === "checkbox"}
              className={`${selectClass} disabled:opacity-45`}
              placeholder={habit.unit ?? "e.g. kcal"}
            />
          </div>
          <div>
            <span className={labelClass}>Goal type</span>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as HabitTarget["mode"])
              }
              className={selectClass}
            >
              <option value="at_least">At least this much</option>
              <option value="at_most">At most this much</option>
              <option value="exact">Exactly this much</option>
            </select>
          </div>
          <div>
            <span className={labelClass}>Period</span>
            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as HabitTarget["period"])
              }
              className={selectClass}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[var(--foreground)]/45">
          Tip: for habits like occurrences, use “At most” with 0.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {existing ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg px-3 py-2 text-sm text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/8"
            >
              Remove goal
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/8"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={value.trim() === "" || !Number.isFinite(Number(value))}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:opacity-40"
          >
            Save goal
          </button>
        </div>
      </div>
    </div>
  );
}
