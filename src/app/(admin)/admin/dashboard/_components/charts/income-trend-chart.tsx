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

import { niceAxisTicks } from "@/lib/bilancio/axis"
import { formatEuro, formatEuroAxis } from "@/lib/utils/format"

import type { IncomeTrendPoint } from "../../analytics-queries"

interface IncomeTrendChartProps {
  data: IncomeTrendPoint[]
}

const INCOME_COLOR = "hsl(142 76% 36%)"

export function IncomeTrendChart({ data }: IncomeTrendChartProps) {
  const hasData = data.some((p) => p.totalCents > 0)

  if (!hasData) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nessun incasso negli ultimi 12 mesi.
      </div>
    )
  }

  // Stesse tacche tonde e stesso formato del grafico del Bilancio
  // (niceAxisTicks + formatEuroAxis): «€30 · €60 · €90 · €120» qui e
  // «500 € · 1.000 €» là erano due modi di scrivere lo stesso asse
  const axis = niceAxisTicks(data.reduce((max, p) => Math.max(max, p.totalCents), 0))

  return (
    <div className="h-64 w-full min-w-0">
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
            ticks={axis.ticks}
            domain={[0, axis.topCents]}
            tickFormatter={formatEuroAxis}
            width={64}
          />
          <Tooltip
            formatter={(value) => [
              formatEuro(typeof value === "number" ? value : 0),
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
