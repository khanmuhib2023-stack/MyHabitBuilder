"use client";

import { useEffect, useId, useState } from "react";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import type { HabitComment } from "@/lib/types";
import { useAppData } from "@/components/providers/AppDataProvider";
import { modalOverlay, textareaClass, ui } from "@/lib/uiClasses";

type Sentiment = HabitComment["sentiment"];

type Props = {
  habit: HabitDefinition;
  categoryLabel: string;
  onClose: () => void;
};

export default function CommentModal({
  habit,
  categoryLabel,
  onClose,
}: Props) {
  const { addComment } = useAppData();
  const titleId = useId();
  const [text, setText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const trimmed = text.trim();
  const canSave = trimmed.length > 0;

  const pickPositive = () => {
    setSentiment((s) => (s === "positive" ? "neutral" : "positive"));
  };

  const pickNegative = () => {
    setSentiment((s) => (s === "negative" ? "neutral" : "negative"));
  };

  const save = () => {
    if (!canSave) return;
    void addComment({
      habitId: habit.id,
      habitName: habit.name,
      habitCategory: categoryLabel,
      text: trimmed,
      sentiment,
    });
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-md p-5 ${ui.modalPanel}`}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
        >
          Comment on {habit.name}
        </h2>
        <p className="mt-1 text-xs text-[var(--foreground)]/50">
          Reflection · {categoryLabel}
        </p>

        <label className="mt-4 block text-xs font-medium text-[var(--foreground)]/60">
          What happened? What did you notice?
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What happened? What did you notice?"
            className={textareaClass}
            autoFocus
          />
        </label>

        <p className="mt-4 text-xs font-medium text-[var(--foreground)]/55">
          How did it feel? (optional)
        </p>
        <div className="mt-2 flex gap-2">
          <SentimentButton
            kind="positive"
            active={sentiment === "positive"}
            onClick={pickPositive}
          />
          <SentimentButton
            kind="negative"
            active={sentiment === "negative"}
            onClick={pickNegative}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--foreground)]/40">
          Leave both unselected for a neutral reflection.
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)]/65 hover:bg-[var(--foreground)]/8"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={save}
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save comment
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function SentimentButton({
  kind,
  active,
  onClick,
}: {
  kind: "positive" | "negative";
  active: boolean;
  onClick: () => void;
}) {
  const label = kind === "positive" ? "Positive" : "Negative";
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Mark as ${label.toLowerCase()}`}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
        active
          ? kind === "positive"
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/15 text-amber-200"
          : "border-[var(--foreground)]/12 bg-[var(--foreground)]/[0.04] text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/8"
      }`}
    >
      <span className="text-lg" aria-hidden>
        {kind === "positive" ? "👍" : "👎"}
      </span>
      {label}
    </button>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={modalOverlay}>
      <div
        className={`absolute inset-0 ${ui.modalBackdrop}`}
        aria-hidden
        onClick={onClose}
      />
      <div className="relative flex w-full max-w-md items-center justify-center">
        {children}
      </div>
    </div>
  );
}
