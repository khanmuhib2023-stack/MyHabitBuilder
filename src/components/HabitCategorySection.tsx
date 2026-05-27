"use client";

import HabitRow from "@/components/HabitRow";
import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";
import type { ValuesByDate } from "@/lib/flexHabitStorage";
import { getValueForHabit } from "@/lib/flexHabitStorage";
import { formatDefaultText } from "@/lib/defaultValueUtils";
import { computeDailyScore } from "@/lib/scoringEngine";
import {
  calculateHabitStreak,
  formatTargetText,
  streakLabel,
  todayStatusLine,
} from "@/lib/targetUtils";
import { ui } from "@/lib/uiClasses";

type Props = {
  categoryId: string;
  label: string;
  isDefaultCategory: boolean;
  habits: HabitDefinition[];
  values: ValuesByDate;
  todayYmd: string;
  onValueChange: (habit: HabitDefinition, value: HabitValue) => void;
  onUseDefault: (habit: HabitDefinition) => void;
  editMode: boolean;
  onDeleteHabit: (habitId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenGoal: (habit: HabitDefinition) => void;
  onOpenDefault: (habit: HabitDefinition) => void;
  onOpenComment: (habit: HabitDefinition) => void;
  latestCommentByHabit: Record<string, string>;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 shrink-0 text-[var(--foreground)]/45 transition-transform duration-200 ease-out ${
        open ? "rotate-0" : "-rotate-90"
      }`}
    >
      <polyline points="5 8 10 13 15 8" />
    </svg>
  );
}

const removeCatBtn =
  "shrink-0 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-400/90 transition hover:bg-red-500/10 hover:text-red-300";

export default function HabitCategorySection({
  categoryId,
  label,
  isDefaultCategory,
  habits,
  values,
  todayYmd,
  onValueChange,
  onUseDefault,
  editMode,
  onDeleteHabit,
  onDeleteCategory,
  isOpen,
  onToggle,
  onOpenGoal,
  onOpenDefault,
  onOpenComment,
  latestCommentByHabit,
}: Props) {
  const panelId = `habit-category-panel-${categoryId}`;

  return (
    <section
      className={`transition-colors ${editMode ? ui.sectionEdit : ui.section}`}
    >
      <h3 className="m-0 border-b border-[var(--foreground)]/5">
        <div className="flex items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg py-1.5 pl-1 pr-2 text-left transition hover:bg-[var(--foreground)]/[0.04]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]/55">
              {label}
            </span>
            <Chevron open={isOpen} />
          </button>
          {editMode ? (
            isDefaultCategory ? (
              <span className="shrink-0 text-[10px] font-medium text-[var(--foreground)]/35">
                Default category
              </span>
            ) : onDeleteCategory ? (
              <button
                type="button"
                onClick={() => onDeleteCategory(categoryId)}
                className={removeCatBtn}
              >
                Remove category
              </button>
            ) : null
          ) : null}
        </div>
      </h3>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          className="min-h-0 overflow-hidden"
          inert={!isOpen ? true : undefined}
        >
          <div className="space-y-2 border-t border-[var(--foreground)]/6 px-3 pb-3 pt-2">
            {habits.length === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--foreground)]/45">
                No habits in this category yet.
              </p>
            ) : (
              habits.map((habit) => {
                const streak = calculateHabitStreak(
                  habit,
                  values,
                  todayYmd
                );
                const streakTx = streakLabel(habit, streak);
                const statusTx = todayStatusLine(habit, values, todayYmd);
                const val = getValueForHabit(values, todayYmd, habit);
                const score = computeDailyScore(habit, val);
                const scoreText =
                  score != null && Number.isFinite(score)
                    ? `${score >= 0 ? "+" : ""}${Math.round(score * 10) / 10} pts`
                    : null;
                return (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    value={val}
                    onChange={(v) => onValueChange(habit, v)}
                    onUseDefault={() => onUseDefault(habit)}
                    editMode={editMode}
                    onDelete={onDeleteHabit}
                    onOpenGoal={() => onOpenGoal(habit)}
                    onOpenDefault={() => onOpenDefault(habit)}
                    onOpenComment={() => onOpenComment(habit)}
                    streakText={streakTx}
                    statusText={statusTx}
                    goalLabel={formatTargetText(habit)}
                    defaultLabel={formatDefaultText(habit)}
                    scoreText={scoreText}
                    latestCommentPreview={
                      latestCommentByHabit[habit.id] ?? null
                    }
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
