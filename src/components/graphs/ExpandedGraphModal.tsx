"use client";

import { useEffect } from "react";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import type {
  DailySeriesPoint,
  GraphTab,
  MonthlySeriesPoint,
} from "@/lib/graphUtils";
import GraphSummaryStats from "@/components/graphs/GraphSummaryStats";
import HabitTrendChart from "@/components/graphs/HabitTrendChart";
import type { SummaryRow } from "@/lib/graphUtils";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { ui } from "@/lib/uiClasses";

type Point = DailySeriesPoint | MonthlySeriesPoint;

type Props = {
  open: boolean;
  onClose: () => void;
  habitName: string;
  tab: GraphTab;
  subtitle: string;
  kind: "line" | "bar";
  habit?: HabitDefinition;
  unit?: string;
  points: Point[];
  compactY?: boolean;
  summaryRows?: SummaryRow[];
  onTimeNavigatePrev?: () => void;
  onTimeNavigateNext?: () => void;
  canTimeNavigateNext?: boolean;
};

export default function ExpandedGraphModal({
  open,
  onClose,
  habitName,
  tab,
  subtitle,
  kind,
  habit,
  unit,
  points,
  compactY,
  summaryRows,
  onTimeNavigatePrev,
  onTimeNavigateNext,
  canTimeNavigateNext = true,
}: Props) {
  const { swipeHandlers } = useSwipeNavigation({
    onSwipeLeft: canTimeNavigateNext ? onTimeNavigateNext : undefined,
    onSwipeRight: onTimeNavigatePrev,
    enabled: open && Boolean(onTimeNavigatePrev || onTimeNavigateNext),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const xAxisPreset = tab === "monthly" ? "monthly" : "default";

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className={`absolute inset-0 ${ui.modalBackdrop}`}
        aria-label="Close"
        onClick={onClose}
      />
      <div className="pointer-events-none relative flex h-full items-center justify-center p-2 sm:p-5">
        <div
          className={`pointer-events-auto flex h-[min(94vh,960px)] w-full max-w-6xl flex-col overflow-hidden transition-opacity duration-200 ${ui.graphModalPanel}`}
          {...swipeHandlers}
          style={{ touchAction: "pan-y" }}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--foreground)]/10 px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">
                {habitName}
              </h2>
              <p className="text-xs text-[var(--foreground)]/50 sm:text-sm">
                {subtitle}
              </p>
              {onTimeNavigatePrev ? (
                <p className="mt-0.5 text-[10px] text-[var(--foreground)]/35">
                  Swipe to change period
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/10"
            >
              Close
            </button>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-5">
            {summaryRows && summaryRows.length > 0 ? (
              <div className="mb-3 shrink-0">
                <GraphSummaryStats rows={summaryRows} />
              </div>
            ) : null}
            <div
              className="pointer-events-none absolute inset-3 rounded-2xl opacity-60 sm:inset-5"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(59, 130, 246, 0.08), transparent 65%)",
              }}
              aria-hidden
            />
            <div className="relative min-h-[min(72vh,620px)] w-full flex-1 min-w-0">
              <HabitTrendChart
                points={points}
                kind={kind}
                habit={habit}
                unit={unit}
                compactY={compactY}
                xAxisPreset={xAxisPreset}
                expanded
                height="100%"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
