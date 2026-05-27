"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import { scoringSummaryLine } from "@/lib/scoringEngine";

type Props = {
  habit: HabitDefinition;
  goalLabel: string;
  defaultLabel: string;
  streakText: string;
  statusText: string | null;
  scoreText: string | null;
  latestCommentPreview?: string | null;
  healthSyncNote?: string | null;
  editMode: boolean;
  canUseDefault: boolean;
  onOpenGoal: () => void;
  onOpenDefault: () => void;
  onUseDefault?: () => void;
  onDelete?: (habitId: string) => void;
};

export default function HabitOverflowMenu({
  habit,
  goalLabel,
  defaultLabel,
  streakText,
  statusText,
  scoreText,
  latestCommentPreview,
  healthSyncNote,
  editMode,
  canUseDefault,
  onOpenGoal,
  onOpenDefault,
  onUseDefault,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item =
    "block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)]/85 hover:bg-[var(--foreground)]/8";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`More options for ${habit.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center rounded-lg border border-[var(--foreground)]/12 text-lg leading-none text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
      >
        ⋯
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--foreground)]/12 bg-[#121212] py-1 shadow-xl"
        >
          {scoreText ? (
            <p className="border-b border-[var(--foreground)]/8 px-3 py-2 text-xs font-medium text-sky-300/90">
              Today&apos;s score: {scoreText}
            </p>
          ) : null}
          <button type="button" role="menuitem" className={item} onClick={() => { onOpenGoal(); setOpen(false); }}>
            {goalLabel}
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { onOpenDefault(); setOpen(false); }}>
            {defaultLabel}
          </button>
          {canUseDefault && onUseDefault ? (
            <button type="button" role="menuitem" className={item} onClick={() => { onUseDefault(); setOpen(false); }}>
              Use default value
            </button>
          ) : null}
          <div className="my-1 border-t border-[var(--foreground)]/8" />
          <p className="px-3 py-1.5 text-[10px] leading-snug text-[var(--foreground)]/45">
            {scoringSummaryLine(habit)}
          </p>
          {streakText ? (
            <p className="px-3 py-1 text-[10px] text-[var(--foreground)]/40">{streakText}</p>
          ) : null}
          {statusText ? (
            <p className="px-3 py-1 text-[10px] text-[var(--foreground)]/40">{statusText}</p>
          ) : null}
          {latestCommentPreview ? (
            <p className="px-3 py-1 text-[10px] text-[var(--foreground)]/40">
              Latest comment: &ldquo;{latestCommentPreview}&rdquo;
            </p>
          ) : null}
          {healthSyncNote ? (
            <p className="px-3 py-1 text-[10px] text-[var(--foreground)]/40">{healthSyncNote}</p>
          ) : null}
          {editMode && onDelete ? (
            <>
              <div className="my-1 border-t border-[var(--foreground)]/8" />
              <button
                type="button"
                role="menuitem"
                className={`${item} text-red-400/90 hover:bg-red-500/10`}
                onClick={() => {
                  onDelete(habit.id);
                  setOpen(false);
                }}
              >
                Delete habit
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
