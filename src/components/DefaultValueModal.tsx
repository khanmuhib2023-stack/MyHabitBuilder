"use client";

import { useEffect, useId, useState } from "react";
import type { HabitDefinition, HabitDefaultValue } from "@/lib/flexHabitTypes";
import { labelClass, modalOverlay, selectClass, ui } from "@/lib/uiClasses";

type Props = {
  habit: HabitDefinition;
  onClose: () => void;
  onSave: (defaultValue: HabitDefaultValue | undefined) => void;
};

export default function DefaultValueModal({ habit, onClose, onSave }: Props) {
  const titleId = useId();
  const existing = habit.defaultValue;
  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const [value, setValue] = useState(
    existing?.value != null ? String(existing.value) : ""
  );
  const [unit, setUnit] = useState(existing?.unit ?? habit.unit ?? "");
  const [applyMode, setApplyMode] = useState<HabitDefaultValue["applyMode"]>(
    existing?.applyMode ?? "manual_fill"
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!enabled) {
      onSave(undefined);
      onClose();
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    onSave({
      enabled: true,
      value: habit.type === "checkbox" ? (n >= 1 ? 1 : 0) : n,
      unit: unit.trim() || habit.unit || undefined,
      applyMode,
    });
    onClose();
  };

  const clear = () => {
    onSave(undefined);
    onClose();
  };

  const unitDisabled = habit.type === "checkbox";

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
          Default value · {habit.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground)]/55">
          Optional preset for quick fill or missing graph days.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded accent-[var(--foreground)]"
          />
          Enable default value
        </label>

        {enabled ? (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="default-value" className={labelClass}>
                Value
              </label>
              <input
                id="default-value"
                type="number"
                min={0}
                step={habit.type === "duration" ? 0.25 : 1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label htmlFor="default-unit" className={labelClass}>
                Unit
              </label>
              <input
                id="default-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={unitDisabled}
                placeholder={habit.unit ?? "e.g. kcal, g"}
                className={`${selectClass} disabled:opacity-45`}
              />
            </div>
            <fieldset>
              <legend className={labelClass}>Apply mode</legend>
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]/80">
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === "manual_fill"}
                    onChange={() => setApplyMode("manual_fill")}
                    className="mt-0.5 accent-[var(--foreground)]"
                  />
                  <span>
                    <span className="font-medium">Manual fill only</span>
                    <span className="mt-0.5 block text-xs text-[var(--foreground)]/45">
                      Show a &ldquo;Use default&rdquo; button on the dashboard.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]/80">
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === "use_for_missing_graph_data"}
                    onChange={() => setApplyMode("use_for_missing_graph_data")}
                    className="mt-0.5 accent-[var(--foreground)]"
                  />
                  <span>
                    <span className="font-medium">Use for missing graph data</span>
                    <span className="mt-0.5 block text-xs text-[var(--foreground)]/45">
                      Graphs use this when a day has no log (not on the
                      dashboard until you log).
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {existing?.enabled ? (
            <button
              type="button"
              onClick={clear}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-400/90 hover:bg-red-500/10"
            >
              Remove default
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
            disabled={enabled && value.trim() === ""}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
