"use client";

import { ui } from "@/lib/uiClasses";

type Props = {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  resetLabel: string;
  canGoNext: boolean;
  canGoPrevious?: boolean;
};

const resetBtn =
  "shrink-0 rounded-full border border-[var(--foreground)]/10 bg-[var(--foreground)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/70 shadow-sm transition hover:border-[var(--foreground)]/18 hover:bg-[var(--foreground)]/8 disabled:cursor-not-allowed disabled:opacity-40";

export default function GraphTimeNavigator({
  label,
  onPrevious,
  onNext,
  onReset,
  resetLabel,
  canGoNext,
  canGoPrevious = true,
}: Props) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-2"
      role="group"
      aria-label="Graph time period"
    >
      <button
        type="button"
        className={ui.navArrow}
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous period"
      >
        ←
      </button>
      <span className="min-w-[10rem] px-1 text-center text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <button
        type="button"
        className={ui.navArrow}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next period"
      >
        →
      </button>
      <button type="button" className={resetBtn} onClick={onReset}>
        {resetLabel}
      </button>
    </div>
  );
}
