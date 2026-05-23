"use client";

import type { DailySeriesPoint } from "@/lib/graphUtils";
import HabitTrendChart from "@/components/graphs/HabitTrendChart";

type Props = {
  points: DailySeriesPoint[];
  kind: "line" | "bar";
  habit?: import("@/lib/flexHabitTypes").HabitDefinition;
  unit?: string;
  compactY?: boolean;
};

export default function Last7DaysGraph(props: Props) {
  return <HabitTrendChart {...props} height={220} />;
}
