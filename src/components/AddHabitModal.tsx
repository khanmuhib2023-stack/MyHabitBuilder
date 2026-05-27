"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HabitDefinition, HabitScoringKey, HabitType } from "@/lib/flexHabitTypes";
import { TYPE_LABELS } from "@/lib/flexHabitTypes";
import type { FlexCategory } from "@/lib/categoryUtils";
import { labelClass, modalOverlayLow, selectClass, ui } from "@/lib/uiClasses";

type Props = {
  onClose: () => void;
  onAdd: (
    habit: Omit<HabitDefinition, "id">
  ) => Promise<{ error: string | null }>;
  categories: FlexCategory[];
  onCreateCategory: (name: string) => string | null;
  onDeleteCategory: (id: string) => void;
};

export default function AddHabitModal({
  onClose,
  onAdd,
  categories,
  onCreateCategory,
  onDeleteCategory,
}: Props) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "study");
  const [type, setType] = useState<HabitType>("number");
  const [scoringKey, setScoringKey] = useState<HabitDefinition["scoringKey"]>(
    "generic"
  );
  const [unit, setUnit] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!categories.some((c) => c.id === category)) {
      const tid = window.setTimeout(() => {
        setCategory(categories[0]?.id ?? "study");
      }, 0);
      return () => window.clearTimeout(tid);
    }
  }, [categories, category]);

  useEffect(() => {
    if (type === "duration" && category === "study") setScoringKey("study_duration");
    else if (type === "gym") setScoringKey("gym");
    else if (type === "five_k") setScoringKey("five_k");
    else if (type === "sleep_late") setScoringKey("sleep_late");
    else if (type === "checkbox") setScoringKey("generic");
    else setScoringKey("generic");
  }, [type, category]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setSubmitError(null);
    setBusy(true);
    const result = await onAdd({
      name: trimmed,
      category,
      type,
      unit: unit.trim() || undefined,
      scoringKey:
        scoringKey && scoringKey !== "generic" ? scoringKey : undefined,
    });
    setBusy(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    onClose();
  };

  const saveNewCategory = () => {
    const t = newCatName.trim();
    if (!t) return;
    const id = onCreateCategory(t);
    setNewCatName("");
    setShowNewCat(false);
    if (id) setCategory(id);
  };

  return (
    <div className={modalOverlayLow}>
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
          New habit
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground)]/55">
          Choose category, tracking type, and an optional unit label.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="habit-name" className={labelClass}>
              Name
            </label>
            <input
              ref={nameRef}
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meditation"
              className={selectClass}
            />
          </div>
          <div>
            <label htmlFor="habit-category" className={labelClass}>
              Category
            </label>
            <select
              id="habit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isDefault ? "" : " (custom)"}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowNewCat((s) => !s)}
                className="text-xs font-medium text-sky-300/90 hover:text-sky-200"
              >
                + New category
              </button>
            </div>
            {showNewCat ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className={selectClass}
                />
                <button
                  type="button"
                  onClick={saveNewCategory}
                  className="shrink-0 rounded-lg bg-[var(--foreground)]/12 px-3 py-2 text-xs font-medium text-[var(--foreground)]"
                >
                  Save
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <p className={labelClass}>Manage custom categories</p>
            <ul className="mt-1 space-y-1">
              {categories
                .filter((c) => !c.isDefault)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--foreground)]/8 px-2 py-1.5 text-xs"
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      className="text-[var(--foreground)]/50 hover:text-red-400"
                      onClick={() => onDeleteCategory(c.id)}
                    >
                      Remove category
                    </button>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <label htmlFor="habit-type" className={labelClass}>
              Type
            </label>
            <select
              id="habit-type"
              value={type}
              onChange={(e) => setType(e.target.value as HabitType)}
              className={selectClass}
            >
              {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="habit-scoring" className={labelClass}>
              Scoring
            </label>
            <select
              id="habit-scoring"
              value={scoringKey ?? "generic"}
              onChange={(e) =>
                setScoringKey(e.target.value as HabitScoringKey)
              }
              className={selectClass}
            >
              <option value="generic">Generic</option>
              <option value="study_duration">Study time</option>
              <option value="steps">Steps</option>
              <option value="morning_routine">Morning routine</option>
              <option value="gym">Gym</option>
              <option value="five_k">5K</option>
              <option value="sleep_late">Sleep (late)</option>
              <option value="calories">Calories</option>
              <option value="protein">Protein</option>
              <option value="creatine">Creatine</option>
              <option value="rule1">Rule #1 (bad)</option>
              <option value="quran">Quran study</option>
              <option value="rakats">Prayer rakats</option>
            </select>
          </div>
          <div>
            <label htmlFor="habit-unit" className={labelClass}>
              Unit <span className="font-normal">(optional)</span>
            </label>
            <input
              id="habit-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. kg, kcal, reps"
              disabled={
                type === "checkbox" ||
                type === "duration" ||
                type === "gym" ||
                type === "five_k" ||
                type === "sleep_late"
              }
              className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-45`}
            />
          </div>
        </div>

        {submitError ? (
          <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300/90">
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/8"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!name.trim() || busy}
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : "Add habit"}
          </button>
        </div>
      </div>
    </div>
  );
}
