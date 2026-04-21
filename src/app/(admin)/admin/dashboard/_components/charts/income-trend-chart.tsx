"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatEur } from "@/lib/utils/format"

import type { IncomeTrendPoint } from "../../analytics-queries"

interface IncomeTrendChartProps {
  data: IncomeTrendPoint[]
}

const INCOME_COLOR = "hsl(142 76% 36%)"

function formatAxisEur(value: number): string {
  if (value >= 100_000) return `€${Math.round(value / 100 / 1000)}k`
  return `€${Math.round(value / 100)}`
}

export function IncomeTrendChart({ data }: IncomeTrendChartProps) {
  const hasData = data.some((p) => p.totalCents > 0)

  if (!hasData) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nessun incasso negli ultimi 12 mesi.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="monthLabel"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisEur}
            width={55}
          />
          <Tooltip
            formatter={(value) => [
              formatEur(typeof value === "number" ? value : 0),
              "Incassi",
            ]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="totalCents"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: INCOME_COLOR }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
