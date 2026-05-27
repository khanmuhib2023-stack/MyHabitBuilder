"use client";

import HabitValueInput from "@/components/HabitValueInput";
import HabitOverflowMenu from "@/components/HabitOverflowMenu";
import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";
import { valueFromDefault } from "@/lib/defaultValueUtils";
import { ui } from "@/lib/uiClasses";

type Props = {
  habit: HabitDefinition;
  value: HabitValue;
  onChange: (next: HabitValue) => void;
  onUseDefault?: () => void;
  editMode?: boolean;
  onDelete?: (habitId: string) => void;
  onOpenGoal: () => void;
  onOpenDefault: () => void;
  onOpenComment: () => void;
  streakText: string;
  statusText: string | null;
  goalLabel: string;
  defaultLabel: string;
  scoreText: string | null;
  latestCommentPreview?: string | null;
};

export default function HabitRow({
  habit,
  value,
  onChange,
  onUseDefault,
  editMode = false,
  onDelete,
  onOpenGoal,
  onOpenDefault,
  onOpenComment,
  streakText,
  statusText,
  goalLabel,
  defaultLabel,
  scoreText,
  latestCommentPreview,
}: Props) {
  const canUseDefault =
    Boolean(habit.defaultValue?.enabled && valueFromDefault(habit) && onUseDefault);

  const healthSyncNote =
    habit.name.toLowerCase() === "steps" || habit.scoringKey === "steps"
      ? "Apple Health — coming soon"
      : null;

  const wideInput = habit.type === "gym";

  return (
    <div
      className={`flex flex-col gap-2.5 px-3 py-3 sm:px-4 ${
        editMode ? ui.habitRowEdit : ui.habitRow
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-medium leading-tight text-[var(--foreground)]">
              {habit.name}
            </p>
            {scoreText ? (
              <span className="text-[10px] font-semibold tabular-nums text-sky-300/80">
                {scoreText}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onOpenComment}
            aria-label={`Comment on ${habit.name}`}
            className="rounded-lg border border-[var(--foreground)]/10 px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
          >
            Comment
          </button>
          <HabitOverflowMenu
            habit={habit}
            goalLabel={goalLabel}
            defaultLabel={defaultLabel}
            streakText={streakText}
            statusText={statusText}
            scoreText={scoreText}
            latestCommentPreview={latestCommentPreview}
            healthSyncNote={healthSyncNote}
            editMode={editMode}
            canUseDefault={canUseDefault}
            onOpenGoal={onOpenGoal}
            onOpenDefault={onOpenDefault}
            onUseDefault={onUseDefault}
            onDelete={onDelete}
          />
        </div>
      </div>
      <div className={wideInput ? "w-full" : "max-w-full"}>
        <HabitValueInput habit={habit} value={value} onChange={onChange} />
      </div>
    </div>
  );
}
