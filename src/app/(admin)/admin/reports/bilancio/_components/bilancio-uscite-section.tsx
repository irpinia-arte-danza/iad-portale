"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EXPENSE_TYPE_LABELS } from "@/lib/schemas/expense"
import { formatEur, formatPercent } from "@/lib/utils/format"

import type { BilancioExpenseTypeEntry } from "../queries"

interface BilancioUsciteSectionProps {
  entries: BilancioExpenseTypeEntry[]
  totalCents: number
}

const RED_SHADES = [
  "hsl(0 84% 60%)",
  "hsl(0 75% 65%)",
  "hsl(0 65% 70%)",
  "hsl(0 55% 75%)",
  "hsl(0 45% 80%)",
]

function shadeFor(index: number): string {
  return RED_SHADES[Math.min(index, RED_SHADES.length - 1)]
}

export function BilancioUsciteSection({
  entries,
  totalCents,
}: BilancioUsciteSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Uscite per categoria</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nessuna uscita nel periodo selezionato.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={entries}
                    dataKey="totalCents"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {entries.map((entry, i) => (
                      <Cell
                        key={entry.type}
                        fill={shadeFor(i)}
                        stroke="var(--background)"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatEur(typeof value === "number" ? value : 0)
                    }
                    labelFormatter={() => ""}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Causale</TableHead>
                    <TableHead className="text-right">Nr.</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, i) => (
                    <TableRow key={entry.type}>
                      <TableCell className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ background: shadeFor(i) }}
                        />
                        <span className="font-medium">
                          {EXPENSE_TYPE_LABELS[entry.type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.count}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatEur(entry.totalCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatPercent(entry.share)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
                    <TableCell className="font-semibold">Totale</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono font-semibold">
                      {formatEur(totalCents)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
