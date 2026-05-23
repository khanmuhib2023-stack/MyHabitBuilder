"use client";



import type { ReactNode } from "react";

import type { HabitDefinition, HabitValue } from "@/lib/flexHabitTypes";

import { getLogSourceForHabit } from "@/lib/flexHabitStorage";

import type { ValuesByDate } from "@/lib/flexHabitStorage";

import { valueFromDefault } from "@/lib/defaultValueUtils";
import { ui } from "@/lib/uiClasses";



type Props = {

  habit: HabitDefinition;

  value: HabitValue;

  values: ValuesByDate;

  todayYmd: string;

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

  latestCommentPreview?: string | null;

};



const inputClass =
  "rounded-lg px-2.5 py-1.5 text-sm tabular-nums ui-input";



export default function HabitRow({

  habit,

  value,

  values,

  todayYmd,

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

  latestCommentPreview,

}: Props) {

  const logSource = getLogSourceForHabit(values, todayYmd, habit.id);

  const canUseDefault =

    Boolean(habit.defaultValue?.enabled && valueFromDefault(habit) && onUseDefault);



  const healthSyncHint =

    habit.category === "health" ? (

      <p className="text-[11px] text-[var(--foreground)]/45">

        Apple Health — coming soon

      </p>

    ) : null;



  let control: ReactNode;



  if (habit.type === "checkbox" && value.type === "checkbox") {

    control = (

      <label className="flex cursor-pointer items-center gap-2 text-sm">

        <input

          type="checkbox"

          checked={value.checked}

          onChange={(e) =>

            onChange({ type: "checkbox", checked: e.target.checked })

          }

          className="size-4 rounded border-[var(--foreground)]/25 accent-[var(--foreground)]"

        />

        <span className="text-[var(--foreground)]/55">Done</span>

      </label>

    );

  } else if (habit.type === "number" && value.type === "number") {

    const setNum = (raw: string) => {

      const n = raw === "" ? 0 : Number(raw);

      const v = Number.isFinite(n)

        ? Math.min(1_000_000_000, Math.max(0, Math.trunc(n)))

        : 0;

      onChange({ type: "number", value: v });

    };

    control = (

      <div className="flex flex-wrap items-center gap-2">

        <input

          type="number"

          min={0}

          step={1}

          inputMode="numeric"

          value={value.value === 0 ? "" : value.value}

          onChange={(e) => setNum(e.target.value)}

          className={`${inputClass} w-28`}

        />

        {habit.unit ? (

          <span className="text-sm text-[var(--foreground)]/50">

            {habit.unit}

          </span>

        ) : null}

      </div>

    );

  } else if (habit.type === "duration" && value.type === "duration") {

    const setH = (raw: string) => {

      const n = raw === "" ? 0 : Number(raw);

      const hours = Number.isFinite(n)

        ? Math.min(24, Math.max(0, Math.trunc(n)))

        : 0;

      onChange({ type: "duration", hours, minutes: value.minutes });

    };

    const setM = (raw: string) => {

      const n = raw === "" ? 0 : Number(raw);

      const minutes = Number.isFinite(n)

        ? Math.min(59, Math.max(0, Math.trunc(n)))

        : 0;

      onChange({ type: "duration", hours: value.hours, minutes });

    };

    control = (

      <div className="flex flex-wrap items-center gap-3 text-sm">

        <label className="flex items-center gap-1.5 text-[var(--foreground)]/55">

          h

          <input

            type="number"

            min={0}

            max={24}

            step={1}

            inputMode="numeric"

            value={value.hours === 0 ? "" : value.hours}

            onChange={(e) => setH(e.target.value)}

            className={`${inputClass} w-16`}

          />

        </label>

        <label className="flex items-center gap-1.5 text-[var(--foreground)]/55">

          m

          <input

            type="number"

            min={0}

            max={59}

            step={1}

            inputMode="numeric"

            value={value.minutes === 0 ? "" : value.minutes}

            onChange={(e) => setM(e.target.value)}

            className={`${inputClass} w-16`}

          />

        </label>

      </div>

    );

  } else {

    control = null;

  }



  return (
    <div
      className={`flex flex-col gap-2 px-4 py-3 ${
        editMode ? ui.habitRowEdit : ui.habitRow
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--foreground)]">{habit.name}</p>

            {healthSyncHint}

            {logSource === "default" ? (

              <p className="mt-0.5 text-[11px] text-[var(--foreground)]/45">

                Logged from default

              </p>

            ) : null}

            {streakText ? (

              <p className="mt-0.5 text-[11px] text-[var(--foreground)]/50">

                {streakText}

              </p>

            ) : null}

            {statusText ? (

              <p className="mt-0.5 text-[11px] text-[var(--foreground)]/45">

                {statusText}

              </p>

            ) : null}

            {latestCommentPreview ? (

              <p className="mt-1 text-[11px] text-[var(--foreground)]/40">

                Latest comment: &ldquo;{latestCommentPreview}&rdquo;

              </p>

            ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {editMode && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(habit.id)}
              className="rounded-lg border border-red-500/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-400/90 transition hover:bg-red-500/10 hover:text-red-300"
            >
              Delete habit
            </button>
          ) : null}
          {control}
          {canUseDefault ? (

            <button

              type="button"

              onClick={onUseDefault}

              className="text-[11px] font-medium text-violet-300/90 hover:text-violet-200"

            >

              Use default

            </button>

          ) : null}

        </div>

      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--foreground)]/6 pt-2">

        <div className="flex flex-wrap items-center gap-3">

          <button

            type="button"

            onClick={onOpenGoal}

            className="text-left text-[11px] font-medium text-sky-300/90 hover:text-sky-200"

          >

            {goalLabel}

          </button>

          <button

            type="button"

            onClick={onOpenDefault}

            className="text-left text-[11px] font-medium text-violet-300/80 hover:text-violet-200"

          >

            {defaultLabel}

          </button>

        </div>

        <button

          type="button"

          onClick={onOpenComment}

          className="text-[11px] font-medium text-[var(--foreground)]/50 hover:text-[var(--foreground)]/75"

        >

          Comment

        </button>

      </div>
    </div>
  );
}

