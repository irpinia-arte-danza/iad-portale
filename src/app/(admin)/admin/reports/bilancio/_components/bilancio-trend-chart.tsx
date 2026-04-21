"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEur } from "@/lib/utils/format"

import type { BilancioMonthlyPoint } from "../queries"

interface BilancioTrendChartProps {
  data: BilancioMonthlyPoint[]
}

const ENTRATE_COLOR = "hsl(142 76% 36%)"
const USCITE_COLOR = "hsl(0 84% 60%)"

function formatAxisEur(value: number): string {
  if (value >= 1000_00) return `€${Math.round(value / 100 / 1000)}k`
  return `€${Math.round(value / 100)}`
}

export function BilancioTrendChart({ data }: BilancioTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Andamento mensile entrate vs uscite
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nessun dato nel periodo selezionato.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
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
                  width={60}
                />
                <Tooltip
                  formatter={(value) =>
                    formatEur(typeof value === "number" ? value : 0)
                  }
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="entrateCents"
                  name="Entrate"
                  fill={ENTRATE_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="usciteCents"
                  name="Uscite"
                  fill={USCITE_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
