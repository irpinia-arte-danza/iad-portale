"use client"

import * as React from "react"
import Link from "next/link"
import { Upload, UserCircle } from "lucide-react"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import { ResponsiveList, type ListColumn } from "@/components/lists/responsive-list"
import { RowActionsRenderer } from "@/components/lists/row-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CARD_STATUS_LABELS,
  type CardStatus,
} from "@/lib/affiliations/card-status"
import { statusTone } from "@/lib/status/tone"
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

  // Alta: allieva e stato. Numero e scadenza da 1024.
  const columns: ListColumn<AthleteCardRow>[] = [
    {
      key: "allieva",
      header: "Allieva",
      width: "md:flex-1",
      cell: (row) => (
        <Link
          href={`/admin/athletes/${row.athleteId}`}
          className="truncate font-medium hover:underline"
        >
          {row.athleteName}
        </Link>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      width: "md:w-32",
      cell: (row) => <CardStatusBadge status={row.status} />,
    },
    {
      key: "tessera",
      header: "Tessera",
      width: "md:w-40",
      cell: (row) =>
        row.card ? (
          <span className="truncate font-mono text-xs">
            n. {row.card.cardNumber ?? "—"}
            {row.card.cardType ? ` ${row.card.cardType}` : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "scadenza",
      header: "Scadenza",
      width: "md:w-28",
      cell: (row) => (
        <span className="text-xs">
          {row.card?.expiryDate ? formatDateShort(new Date(row.card.expiryDate)) : "—"}
        </span>
      ),
    },
  ]

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
          // Una riga sola che si ridispone (ResponsiveList): tabella da 768,
          // card sul telefono con un tasto «Carica» dove la tessera manca o
          // sta per scadere, e il menu «…» per il resto
          <ResponsiveList
            label={`Tessere ${entity}`}
            items={visible}
            getId={(row) => row.athleteId}
            columns={columns}
            empty={{ title: "Nessuna allieva in questo stato", hint: "" }}
            cardLines={(row) => [
              <span key="stato" className="flex flex-wrap items-center gap-1.5">
                <CardStatusBadge status={row.status} />
                {row.card ? (
                  <span className="font-mono">
                    n. {row.card.cardNumber ?? "—"}
                    {row.card.cardType ? ` ${row.card.cardType}` : ""}
                  </span>
                ) : null}
                {row.card?.expiryDate ? (
                  <span>· scade il {formatDateShort(new Date(row.card.expiryDate))}</span>
                ) : null}
              </span>,
            ]}
            rowClassName={(row) =>
              cn(
                "py-2 hover:bg-muted/50 max-md:min-h-[52px]",
                // Scaduta o assente: senza assicurazione non si fa lezione
                statusTone({ kind: "card", status: row.status }) === "block" &&
                  "bg-status-block-bg",
              )
            }
            actions={(row) => (
              <RowActionsRenderer
                layout="responsive"
                // Card corta (nome e stato): il tasto sta accanto al nome,
                // non su una riga sua
                cardInline
                label={`Azioni per ${row.athleteName}`}
                actions={[
                  // Solo in card: in tabella il nome è già il link alla
                  // scheda e la riga resta alta una riga di testo.
                  // La tessera si carica dalla scheda (Documenti), dove il
                  // PDF viene letto e controllato: il tasto porta lì. Valida:
                  // niente tasto, resta il menu.
                  {
                    key: "upload",
                    label: "Carica",
                    icon: Upload,
                    href: `/admin/athletes/${row.athleteId}?tab=documenti`,
                    primary: row.status !== "valid",
                    cardOnly: true,
                  },
                  {
                    key: "open",
                    label: "Apri scheda allieva",
                    icon: UserCircle,
                    href: `/admin/athletes/${row.athleteId}`,
                    cardOnly: true,
                  },
                ]}
              />
            )}
          />
        )}
      </CardContent>
    </Card>
  )
}
