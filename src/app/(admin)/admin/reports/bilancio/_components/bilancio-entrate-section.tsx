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
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { formatEur, formatPercent } from "@/lib/utils/format"

import type { BilancioFeeTypeEntry } from "../queries"

interface BilancioEntrateSectionProps {
  entries: BilancioFeeTypeEntry[]
  totalCents: number
}

const GREEN_SHADES = [
  "hsl(142 76% 36%)",
  "hsl(142 70% 45%)",
  "hsl(142 60% 55%)",
  "hsl(142 50% 65%)",
  "hsl(142 40% 75%)",
]

function shadeFor(index: number): string {
  return GREEN_SHADES[Math.min(index, GREEN_SHADES.length - 1)]
}

export function BilancioEntrateSection({
  entries,
  totalCents,
}: BilancioEntrateSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrate per categoria</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nessuna entrata nel periodo selezionato.
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
                    <TableHead>Tipo quota</TableHead>
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
                          {FEE_TYPE_LABELS[entry.type]}
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
