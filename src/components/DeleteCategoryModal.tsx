"use client";

import { useEffect, useId, useState } from "react";
import type { FlexCategory } from "@/lib/categoryUtils";
import { modalOverlay, selectClass, ui } from "@/lib/uiClasses";

type Props = {
  category: FlexCategory;
  habitCount: number;
  categories: FlexCategory[];
  onClose: () => void;
  onConfirmDelete: () => void;
  onConfirmMove: (moveToCategoryId: string) => void;
  onConfirmMoveToStudy: () => void;
};

export default function DeleteCategoryModal({
  category,
  habitCount,
  categories,
  onClose,
  onConfirmDelete,
  onConfirmMove,
  onConfirmMoveToStudy,
}: Props) {
  const titleId = useId();
  const targets = categories.filter((c) => c.id !== category.id);
  const [moveTo, setMoveTo] = useState(targets[0]?.id ?? "study");
  const effectiveMoveTo = targets.some((c) => c.id === moveTo)
    ? moveTo
    : (targets[0]?.id ?? "study");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const empty = habitCount === 0;

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
        className={`relative z-10 w-full max-w-md p-6 ${ui.modalPanel}`}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          Remove category
        </h2>
        <p className="mt-2 text-sm text-[var(--foreground)]/60">
          {empty ? (
            <>
              Remove{" "}
              <strong className="text-[var(--foreground)]">{category.name}</strong>
              ? This category has no habits.
            </>
          ) : (
            <>
              This category contains {habitCount} habit
              {habitCount === 1 ? "" : "s"}. What should happen to them?
            </>
          )}
        </p>

        {!empty ? (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-[var(--foreground)]/60">
              Move habits to another category
              <select
                value={effectiveMoveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className={selectClass}
              >
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onConfirmMove(effectiveMoveTo)}
              className="w-full rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600"
            >
              Remove category
            </button>
            <button
              type="button"
              onClick={onConfirmMoveToStudy}
              className="w-full rounded-xl border border-[var(--foreground)]/15 px-4 py-2.5 text-sm font-medium text-[var(--foreground)]/75 hover:bg-[var(--foreground)]/8"
            >
              Move habits to Study
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirmDelete}
            className="mt-4 w-full rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600"
          >
            Remove category
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/8"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
