"use client"

import * as React from "react"
import Link from "next/link"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CARD_STATUS_LABELS,
  type CardStatus,
} from "@/lib/affiliations/card-status"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/utils/format"

import type { AthleteCardRow } from "../queries"

const FILTERS: (CardStatus | "all")[] = [
  "all",
  "missing",
  "expired",
  "expiring",
  "valid",
]

export function CardsOverview({
  rows,
  entity,
}: {
  rows: AthleteCardRow[]
  entity: string
}) {
  const [filter, setFilter] = React.useState<CardStatus | "all">("all")

  const counts = React.useMemo(() => {
    const base: Record<CardStatus, number> = {
      missing: 0,
      expired: 0,
      expiring: 0,
      valid: 0,
    }
    for (const row of rows) base[row.status] += 1
    return base
  }, [rows])

  const visible =
    filter === "all" ? rows : rows.filter((r) => r.status === filter)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stato tessere {entity}</CardTitle>
        <CardDescription>
          Una riga per allieva attiva, con la tessera più recente. Lo stato è
          calcolato dalla scadenza, non è un dato salvato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
              className="min-h-11"
            >
              {value === "all"
                ? `Tutte (${rows.length})`
                : `${CARD_STATUS_LABELS[value]} (${counts[value]})`}
            </Button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nessuna allieva in questo stato.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allieva</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Tessera
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Scadenza
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={row.athleteId}
                    className={cn(
                      "hover:bg-muted/50",
                      row.status === "expired" &&
                        "bg-red-50 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/50",
                    )}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/athletes/${row.athleteId}`}
                        className="font-medium hover:underline"
                      >
                        {row.athleteName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CardStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {row.card ? (
                        <span className="font-mono text-xs">
                          n. {row.card.cardNumber ?? "—"}
                          {row.card.cardType ? ` ${row.card.cardType}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {row.card?.expiryDate
                        ? formatDateShort(new Date(row.card.expiryDate))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
