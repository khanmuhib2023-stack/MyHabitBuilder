"use client";

import type { WeeklySeriesPoint } from "@/lib/graphUtils";
import HabitTrendChart from "@/components/graphs/HabitTrendChart";

type Props = {
  points: WeeklySeriesPoint[];
  kind: "line" | "bar";
  habit?: import("@/lib/flexHabitTypes").HabitDefinition;
  unit?: string;
  weekCompletion?: boolean;
  xAxisPreset?: "weeklyCard" | "weeklyExpanded";
};

export default function WeeklyGraph(props: Props) {
  const { xAxisPreset = "weeklyCard", ...rest } = props;
  return (
    <HabitTrendChart
      {...rest}
      height={280}
      xAxisPreset={xAxisPreset}
    />
  );
}
