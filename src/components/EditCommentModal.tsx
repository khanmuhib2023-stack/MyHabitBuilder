"use client";

import { useEffect, useId, useState } from "react";
import type { HabitComment } from "@/lib/types";
import { useAppData } from "@/components/providers/AppDataProvider";
import { modalOverlay, textareaClass, ui } from "@/lib/uiClasses";

type Sentiment = HabitComment["sentiment"];

type Props = {
  comment: HabitComment;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditCommentModal({ comment, onClose, onSaved }: Props) {
  const { editComment } = useAppData();
  const titleId = useId();
  const [text, setText] = useState(comment.text);
  const [sentiment, setSentiment] = useState<Sentiment>(comment.sentiment);

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

  const save = async () => {
    if (!canSave) return;
    const updated = await editComment(comment.id, {
      text: trimmed,
      sentiment,
    });
    if (!updated) return;
    onSaved();
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
        className={`relative z-10 w-full max-w-md p-5 ${ui.modalPanel}`}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
        >
          Edit comment
        </h2>
        <p className="mt-1 text-xs text-[var(--foreground)]/50">
          {comment.habitName}
          {comment.habitCategory ? ` · ${comment.habitCategory}` : ""}
        </p>

        <label className="mt-4 block text-xs font-medium text-[var(--foreground)]/60">
          Comment
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={textareaClass}
            autoFocus
          />
        </label>

        <p className="mt-4 text-xs font-medium text-[var(--foreground)]/55">
          Sentiment
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
          Leave both unselected for neutral.
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
            Save changes
          </button>
        </div>
      </div>
    </div>
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
