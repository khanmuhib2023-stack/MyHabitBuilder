"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import HabitGraphCard from "@/components/graphs/HabitGraphCard";
import GraphsTabs from "@/components/graphs/GraphsTabs";
import GraphTimeNavigator from "@/components/graphs/GraphTimeNavigator";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import {
  canAdvanceLast7Window,
  formatLast7PeriodLabel,
  shiftLast7WindowEnd,
  startOfLocalDay,
  type GraphTab,
} from "@/lib/graphUtils";
import { useAppData } from "@/components/providers/AppDataProvider";
import { ui } from "@/lib/uiClasses";
type Filter = "all" | string;

function sortHabits(
  defs: HabitDefinition[],
  cats: { id: string }[]
): HabitDefinition[] {
  const order = new Map(cats.map((c, i) => [c.id, i]));
  return [...defs].sort((a, b) => {
    const ca = order.get(a.category) ?? 999;
    const cb = order.get(b.category) ?? 999;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
}

export default function GraphsPage() {
  const { hydrated, dataLoading, definitions, values, categories, reload } =
    useAppData();
  const [tab, setTab] = useState<GraphTab>("last7");
  const [windowEndDate, setWindowEndDate] = useState(() => startOfLocalDay());
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());
  const [filter, setFilter] = useState<Filter>("all");
  const [timeKey, setTimeKey] = useState(0);

  const currentYear = new Date().getFullYear();
  const canNextLast7 = canAdvanceLast7Window(windowEndDate);
  const canNextYear = chartYear < currentYear;

  const last7Label = useMemo(
    () => formatLast7PeriodLabel(windowEndDate),
    [windowEndDate]
  );

  const goPrev = useCallback(() => {
    if (tab === "last7") {
      setWindowEndDate((d) => shiftLast7WindowEnd(d, -1));
    } else {
      setChartYear((y) => y - 1);
    }
    setTimeKey((k) => k + 1);
  }, [tab]);

  const goNext = useCallback(() => {
    if (tab === "last7") {
      setWindowEndDate((d) =>
        canAdvanceLast7Window(d) ? shiftLast7WindowEnd(d, 1) : d
      );
    } else {
      setChartYear((y) => (y < currentYear ? y + 1 : y));
    }
    setTimeKey((k) => k + 1);
  }, [tab, currentYear]);

  const goReset = useCallback(() => {
    if (tab === "last7") {
      setWindowEndDate(startOfLocalDay());
    } else {
      setChartYear(currentYear);
    }
    setTimeKey((k) => k + 1);
  }, [tab, currentYear]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? definitions
        : definitions.filter((h) => h.category === filter);
    return sortHabits(base, categories);
  }, [definitions, filter, categories]);

  const navigatorLabel = tab === "last7" ? last7Label : String(chartYear);
  const canGoNext = tab === "last7" ? canNextLast7 : canNextYear;
  const resetLabel = tab === "last7" ? "Today" : "Current year";

  if (!hydrated || dataLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-[var(--foreground)]/50">
          {dataLoading ? "Loading your data…" : "Loading…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Graphs
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/50">
          Trends from your logged habit values.
        </p>
      </header>

      <GraphsTabs value={tab} onChange={setTab} />

      <GraphTimeNavigator
        label={navigatorLabel}
        onPrevious={goPrev}
        onNext={goNext}
        onReset={goReset}
        resetLabel={resetLabel}
        canGoNext={canGoNext}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]/55">
          Category
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`rounded-lg px-2 py-1.5 text-sm ${ui.input}`}
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-[10px] text-[var(--foreground)]/40">
        Swipe charts left or right to change the time period
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[var(--foreground)]/45">
          No habits to chart. Add habits on the Today page.
        </p>
      ) : (
        <div
          key={`${tab}-${timeKey}`}
          className="mt-6 space-y-6 transition-opacity duration-200 ease-out"
        >
          {filtered.map((habit) => (
            <HabitGraphCard
              key={habit.id}
              habit={habit}
              values={values}
              tab={tab}
              windowEndDate={windowEndDate}
              chartYear={chartYear}
              categories={categories}
              onTimeNavigatePrev={goPrev}
              onTimeNavigateNext={goNext}
              canTimeNavigateNext={canGoNext}
            />
          ))}
        </div>
      )}
    </main>
  );
}
