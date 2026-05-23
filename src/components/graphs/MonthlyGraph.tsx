"use client";

import type { MonthlySeriesPoint } from "@/lib/graphUtils";
import HabitTrendChart from "@/components/graphs/HabitTrendChart";

type Props = {
  points: MonthlySeriesPoint[];
  kind: "line" | "bar";
  habit?: import("@/lib/flexHabitTypes").HabitDefinition;
  unit?: string;
};

export default function MonthlyGraph(props: Props) {
  return <HabitTrendChart {...props} height={240} xAxisPreset="monthly" />;
}
