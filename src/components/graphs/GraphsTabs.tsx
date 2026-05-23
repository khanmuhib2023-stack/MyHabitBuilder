"use client";

import type { GraphTab } from "@/lib/graphUtils";
import { ui } from "@/lib/uiClasses";

type Props = {
  value: GraphTab;
  onChange: (next: GraphTab) => void;
};

const btn =
  "flex-1 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]/30 sm:flex-none sm:px-5";

export default function GraphsTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Graph range" className={ui.pillTabs}>
      <button
        type="button"
        role="tab"
        aria-selected={value === "last7"}
        className={`${btn} ${value === "last7" ? ui.pillTabActive : ui.pillTab}`}
        onClick={() => onChange("last7")}
      >
        Last 7 Days
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "monthly"}
        className={`${btn} ${value === "monthly" ? ui.pillTabActive : ui.pillTab}`}
        onClick={() => onChange("monthly")}
      >
        Monthly
      </button>
    </div>
  );
}
