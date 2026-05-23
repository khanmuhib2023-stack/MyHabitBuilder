"use client";

import type { SummaryRow } from "@/lib/graphUtils";
import { ui } from "@/lib/uiClasses";

type Props = {
  rows: SummaryRow[];
};

export default function GraphSummaryStats({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <dl className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div
          key={`${i}-${r.label}`}
          className={`flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-3 py-2 ${ui.surfaceInset}`}
        >
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--foreground)]/45">
            {r.label}
          </dt>
          <dd className="text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
