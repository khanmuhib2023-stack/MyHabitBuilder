"use client";

import type { CSSProperties } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import {
  formatYAxisTick,
  getYAxisDomain,
  weeklyXTickLabel,
} from "@/lib/chartAxisUtils";
import type {
  DailySeriesPoint,
  MonthlySeriesPoint,
  WeeklySeriesPoint,
} from "@/lib/graphUtils";

export type TrendPoint =
  | DailySeriesPoint
  | MonthlySeriesPoint
  | WeeklySeriesPoint;

type Props = {
  points: TrendPoint[];
  kind: "line" | "bar";
  habit?: HabitDefinition;
  unit?: string;
  compactY?: boolean;
  weekCompletion?: boolean;
  height?: number | string;
  xAxisPreset?: "default" | "monthly" | "weeklyCard" | "weeklyExpanded";
  expanded?: boolean;
};

const tickStyle = { fill: "rgba(237,237,237,0.5)", fontSize: 11 };
const grid = { stroke: "rgba(255,255,255,0.06)" };
const tooltipStyle: CSSProperties = {
  backgroundColor: "rgba(15,15,15,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#ededed",
};

function isWeeklyPoint(p: TrendPoint): p is WeeklySeriesPoint {
  return "monthTick" in p;
}

export default function HabitTrendChart({
  points,
  kind,
  habit,
  unit,
  compactY,
  weekCompletion,
  height = 220,
  xAxisPreset = "default",
  expanded = false,
}: Props) {
  const data = points.map((p) => ({
    ...p,
    displayActual: kind === "bar" ? (p.actual ?? 0) : p.actual,
    gap0: p.gapBase ?? 0,
    gap1: p.gapSize ?? 0,
  }));

  const isMonthlyAxis = xAxisPreset === "monthly";
  const isWeeklyAxis =
    xAxisPreset === "weeklyCard" || xAxisPreset === "weeklyExpanded";
  const expandedWeekly = xAxisPreset === "weeklyExpanded";
  const weeklyMode = expandedWeekly ? "expanded" : "card";
  const isExpandedView = expanded || expandedWeekly;

  const marginBottom = isWeeklyAxis ? (expandedWeekly ? 80 : 32) : 4;
  const xAxisHeight = isWeeklyAxis ? (expandedWeekly ? 72 : 28) : 36;
  const tickFontSize = isWeeklyAxis ? 10 : 11;
  const angle = isMonthlyAxis
    ? 0
    : isWeeklyAxis
      ? expandedWeekly
        ? -34
        : 0
      : data.length > 6
        ? -20
        : 0;
  const textAnchor = isMonthlyAxis
    ? ("middle" as const)
    : isWeeklyAxis && !expandedWeekly
      ? ("middle" as const)
      : data.length > 6 || expandedWeekly
        ? ("end" as const)
        : ("middle" as const);

  const maxBarSize = isWeeklyAxis ? (expandedWeekly ? 12 : 8) : 36;
  const showLineDots =
    kind === "line" && data.length <= (isWeeklyAxis ? 20 : 14);

  const hasTarget = points.some((p) => p.target != null);
  const showGap = points.some((p) => (p.gapSize ?? 0) > 0);
  const showTrend = points.some((p) => p.trend != null);

  const yDomain =
    habit != null
      ? getYAxisDomain(habit, points, {
          weekCompletion,
          kind,
          weeklyChart: isWeeklyAxis,
          monthlyChart: isMonthlyAxis,
        })
      : weekCompletion
        ? [0, 7]
        : compactY
          ? [0, 1]
          : ([0, "auto"] as [number, string]);

  const yTickFormatter = (v: number) =>
    habit != null ? formatYAxisTick(v, habit) : String(v);

  const xTickFormatter = (_: string, index: number) => {
    const p = data[index];
    if (!p || !isWeeklyPoint(p)) return _;
    return weeklyXTickLabel(index, p, weeklyMode);
  };

  const fmt = (name: string, v: unknown) => {
    if (v == null || v === "") return ["—", name];
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return ["—", name];
    if (unit && name !== "Gap") return [`${n} ${unit}`, name];
    if (compactY && name === "Actual")
      return [n >= 1 ? "Done" : "Not done", name];
    return [String(n), name];
  };

  const shellClass = isExpandedView
    ? "relative h-full w-full overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#141820] to-[#0d0f14] p-2"
    : "relative h-full w-full";

  const minH = isWeeklyAxis ? "min-h-[260px]" : "min-h-[220px]";

  return (
    <div style={{ width: "100%", height }} className={`${minH} min-w-0`}>
      <div className={shellClass}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 8,
              right: 8,
              left: 0,
              bottom: marginBottom,
            }}
          >
            <CartesianGrid {...grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ ...tickStyle, fontSize: tickFontSize }}
              interval={0}
              tickFormatter={isWeeklyAxis ? xTickFormatter : undefined}
              tickLine={false}
              axisLine={false}
              height={xAxisHeight}
              angle={angle}
              textAnchor={textAnchor}
              tickMargin={4}
              minTickGap={
                isMonthlyAxis ? 4 : isWeeklyAxis ? (expandedWeekly ? 8 : 36) : undefined
              }
            />
            <YAxis
              width={44}
              tick={{ ...tickStyle, fontSize: tickFontSize }}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              allowDecimals={habit?.type === "duration"}
              tickFormatter={yTickFormatter}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, name) =>
                fmt(String(name), v as number | string | null)
              }
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as TrendPoint | undefined;
                if (row && isWeeklyPoint(row)) return row.label;
                return payload?.[0]?.payload?.label ?? "";
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{
                fontSize: 11,
                color: "rgba(237,237,237,0.6)",
                paddingTop: 6,
              }}
            />
            {showGap && hasTarget ? (
              <>
                <Area
                  type="monotone"
                  dataKey="gap0"
                  stackId="g"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="gap1"
                  stackId="g"
                  stroke="none"
                  fill="rgba(125,211,252,0.1)"
                  legendType="none"
                  isAnimationActive={false}
                />
              </>
            ) : null}
            {kind === "bar" ? (
              <Bar
                dataKey="displayActual"
                name="Actual"
                fill="rgba(148, 163, 184, 0.55)"
                radius={[3, 3, 0, 0]}
                maxBarSize={maxBarSize}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="displayActual"
                name="Actual"
                stroke="rgba(125, 211, 252, 0.95)"
                strokeWidth={2}
                dot={
                  showLineDots
                    ? (props) => {
                        const assumed = Boolean(
                          (props.payload as { assumed?: boolean })?.assumed
                        );
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={3}
                            fill="rgba(125, 211, 252, 0.95)"
                            fillOpacity={assumed ? 0.35 : 1}
                            stroke={
                              assumed
                                ? "rgba(125, 211, 252, 0.5)"
                                : "rgba(125, 211, 252, 0.95)"
                            }
                            strokeWidth={assumed ? 1 : 0}
                            strokeDasharray={assumed ? "2 2" : undefined}
                          />
                        );
                      }
                    : false
                }
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {hasTarget ? (
              <Line
                type="monotone"
                dataKey="target"
                name="Goal"
                stroke="rgba(237,237,237,0.45)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {showTrend ? (
              <Line
                type="monotone"
                dataKey="trend"
                name="Trend"
                stroke="rgba(248,113,113,0.65)"
                strokeWidth={1}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
