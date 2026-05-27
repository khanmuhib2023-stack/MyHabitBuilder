"use client";

import { useMemo, useRef, useState } from "react";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import { hasAnyStoredLogForHabit, type ValuesByDate } from "@/lib/flexHabitStorage";
import {
  buildDailySeries,
  buildMonthlySeries,
  buildLast7Summary,
  buildMonthlySummary,
  chartKindForHabit,
  getLast7Days,
  getLast7GraphSubtitle,
  getMonthlyGraphSubtitle,
  getMonthsForYear,
  type DailySeriesOptions,
  type GraphTab,
} from "@/lib/graphUtils";
import {
  calculateHabitScoreForDate,
} from "@/lib/scoringEngine";
import { getValueForHabit } from "@/lib/flexHabitStorage";
import type { GymWorkoutKey } from "@/lib/flexHabitTypes";
import {
  GYM_WORKOUT_EXERCISES,
} from "@/lib/gymWorkouts";
import {
  isFiveKHabit,
  isGymHabit,
  type FiveKGraphMode,
} from "@/lib/habitScalar";
import GraphSeriesControls from "@/components/graphs/GraphSeriesControls";
import Last7DaysGraph from "@/components/graphs/Last7DaysGraph";
import MonthlyGraph from "@/components/graphs/MonthlyGraph";
import ExpandedGraphModal from "@/components/graphs/ExpandedGraphModal";
import { CATEGORY_LABELS, DEFAULT_CATEGORY_IDS } from "@/lib/flexHabitTypes";
import type { DefaultCategoryId } from "@/lib/flexHabitTypes";
import { categoryLabel } from "@/lib/categoryUtils";
import type { FlexCategory } from "@/lib/categoryUtils";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { ui } from "@/lib/uiClasses";

type Props = {
  habit: HabitDefinition;
  values: ValuesByDate;
  tab: GraphTab;
  windowEndDate: Date;
  categories: FlexCategory[];
  chartYear: number;
  onTimeNavigatePrev?: () => void;
  onTimeNavigateNext?: () => void;
  canTimeNavigateNext?: boolean;
};

export default function HabitGraphCard({
  habit,
  values,
  tab,
  windowEndDate,
  categories,
  chartYear,
  onTimeNavigatePrev,
  onTimeNavigateNext,
  canTimeNavigateNext = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = useRef(0);
  const [gymWorkout, setGymWorkout] = useState<GymWorkoutKey>("chest_back");
  const [gymExerciseId, setGymExerciseId] = useState(
    GYM_WORKOUT_EXERCISES.chest_back[0]?.id ?? "bench_press"
  );
  const [fiveKMode, setFiveKMode] = useState<FiveKGraphMode>("distance");

  const seriesOptions: DailySeriesOptions | undefined = useMemo(() => {
    if (isGymHabit(habit)) {
      return { gymWorkout, gymExerciseId };
    }
    if (isFiveKHabit(habit)) {
      return { fiveKMode };
    }
    return undefined;
  }, [habit, gymWorkout, gymExerciseId, fiveKMode]);

  const handleGymWorkoutChange = (w: GymWorkoutKey) => {
    setGymWorkout(w);
    const first = GYM_WORKOUT_EXERCISES[w][0]?.id;
    if (first) setGymExerciseId(first);
  };

  const openExpanded = () => setExpanded(true);
  const handleCardActivate = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) openExpanded();
    lastTapRef.current = now;
  };

  const last7 = useMemo(
    () => getLast7Days(windowEndDate),
    [windowEndDate]
  );
  const months = useMemo(() => getMonthsForYear(chartYear), [chartYear]);

  const dailySeries = useMemo(
    () => buildDailySeries(habit, values, last7, seriesOptions),
    [habit, values, last7, seriesOptions]
  );

  const monthlySeries = useMemo(
    () => buildMonthlySeries(habit, values, months),
    [habit, values, months]
  );

  const summary = useMemo(() => {
    const base =
      tab === "last7"
        ? buildLast7Summary(habit, values, windowEndDate)
        : buildMonthlySummary(habit, values, chartYear);
    const endY = last7[last7.length - 1]?.ymd;
    if (!endY) return base;
    const sc = calculateHabitScoreForDate(
      habit,
      values,
      endY,
      getValueForHabit(values, endY, habit)
    );
    if (sc == null || !Number.isFinite(sc)) return base;
    return [
      {
        label: "Today's score",
        value: `${sc >= 0 ? "+" : ""}${Math.round(sc * 10) / 10}`,
      },
      ...base,
    ];
  }, [habit, values, windowEndDate, tab, chartYear, last7]);

  const hasEver = useMemo(
    () => hasAnyStoredLogForHabit(values, habit.id),
    [values, habit.id]
  );

  const kind = chartKindForHabit(habit);
  const compactY = habit.type === "checkbox";

  const chartSubtitle =
    tab === "last7"
      ? getLast7GraphSubtitle(windowEndDate)
      : getMonthlyGraphSubtitle(chartYear);

  const catLabel = DEFAULT_CATEGORY_IDS.includes(
    habit.category as DefaultCategoryId
  )
    ? CATEGORY_LABELS[habit.category as DefaultCategoryId]
    : categoryLabel(categories, habit.category);

  const points = tab === "last7" ? dailySeries : monthlySeries;

  const { swipeHandlers } = useSwipeNavigation({
    onSwipeLeft: canTimeNavigateNext ? onTimeNavigateNext : undefined,
    onSwipeRight: onTimeNavigatePrev,
    enabled: Boolean(onTimeNavigatePrev || onTimeNavigateNext),
  });

  if (!hasEver) {
    return (
      <article className={`${ui.card} p-4 sm:p-5`}>
        <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            {habit.name}
          </h2>
          <span className="rounded-full border border-[var(--foreground)]/12 bg-[var(--foreground)]/[0.05] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]/50">
            {catLabel}
          </span>
        </header>
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/55">
          No data yet. Start logging this habit to see trends.
        </p>
      </article>
    );
  }

  return (
    <>
      <article
        className={`${ui.card} p-4 sm:p-5 transition-opacity duration-200`}
        onDoubleClick={openExpanded}
        role="presentation"
        {...swipeHandlers}
        style={{ touchAction: "pan-y" }}
      >
        <header
          className="mb-2 flex flex-wrap items-baseline justify-between gap-2"
          onTouchEnd={handleCardActivate}
        >
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            {habit.name}
          </h2>
        </header>

        {isGymHabit(habit) ? (
          <GraphSeriesControls
            variant="gym"
            workout={gymWorkout}
            exerciseId={gymExerciseId}
            onWorkoutChange={handleGymWorkoutChange}
            onExerciseChange={setGymExerciseId}
          />
        ) : null}
        {isFiveKHabit(habit) ? (
          <GraphSeriesControls
            variant="five_k"
            mode={fiveKMode}
            onModeChange={setFiveKMode}
          />
        ) : null}

        {tab === "last7" ? (
          <Last7DaysGraph
            points={dailySeries}
            kind={kind}
            habit={habit}
            unit={habit.unit}
            compactY={compactY}
          />
        ) : (
          <MonthlyGraph
            points={monthlySeries}
            kind={kind}
            habit={habit}
            unit={habit.unit}
          />
        )}
      </article>

      <ExpandedGraphModal
        open={expanded}
        onClose={() => setExpanded(false)}
        habitName={habit.name}
        tab={tab}
        subtitle={chartSubtitle}
        kind={kind}
        habit={habit}
        unit={habit.unit}
        points={points}
        compactY={compactY}
        summaryRows={summary}
        onTimeNavigatePrev={onTimeNavigatePrev}
        onTimeNavigateNext={onTimeNavigateNext}
        canTimeNavigateNext={canTimeNavigateNext}
      />
    </>
  );
}
