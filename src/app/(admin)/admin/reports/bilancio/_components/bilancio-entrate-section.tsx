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
import { formatEuro, formatPercent } from "@/lib/utils/format"

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
            {/* minmax(0,…) e min-w-0: senza, sul telefono la tabella si
                prendeva la sua larghezza intera e la colonna «%» usciva dal
                riquadro; ora scorre dentro la card */}
            <div className="h-64 w-full min-w-0">
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
                      formatEuro(typeof value === "number" ? value : 0)
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

            <div className="min-w-0 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Causale</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Nr.</TableHead>
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
                      <TableCell className="hidden text-right font-mono sm:table-cell">
                        {entry.count}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatEuro(entry.totalCents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatPercent(entry.share)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
                    <TableCell className="font-semibold">Totale</TableCell>
                    <TableCell className="hidden sm:table-cell" />
                    <TableCell className="text-right font-mono font-semibold">
                      {formatEuro(totalCents)}
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
