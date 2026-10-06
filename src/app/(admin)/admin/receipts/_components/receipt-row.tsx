"use client"

import Link from "next/link"
import { MoreHorizontal, Printer, Send, UserCircle, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { receiptPdfHref } from "@/lib/receipts/types"
import { formatDateShort, formatEur } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import type { ReceiptListRow } from "../queries"

// ─────────────────────────────────────────────────────────────────────────
// Una ricevuta per riga, con aree fisse come in Scadenze (#38).
//
// Prima erano quattro icone da 20 px senza testo, e quella dell'email
// cambiava forma dopo l'invio: su iPad si toccava quella accanto. Adesso c'è
// un tasto "Consegna" che si legge, e il resto sta nel menu.
// ─────────────────────────────────────────────────────────────────────────

const GRID = cn(
  "grid items-center gap-x-3 gap-y-2",
  // Telefono: card
  "grid-cols-[auto_minmax(0,1fr)_auto]",
  "[grid-template-areas:'sel_numero_importo'_'vuoto_allieva_allieva'_'vuoto_pagante_pagante'_'vuoto_stato_stato'_'azioni_azioni_azioni']",
  // Tablet: tre righe, azioni a destra
  "md:grid-cols-[auto_minmax(0,1fr)_auto_auto]",
  "md:[grid-template-areas:'sel_numero_importo_azioni'_'sel_allieva_allieva_azioni'_'sel_pagante_stato_azioni']",
  // Da 1024: una riga
  "lg:grid-cols-[auto_minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]",
  "lg:[grid-template-areas:'sel_numero_allieva_pagante_importo_stato_azioni']",
)

const TONE: Record<string, string> = {
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  neutral: "",
  muted: "text-muted-foreground",
}

interface ReceiptRowProps {
  receipt: ReceiptListRow
  selected: boolean
  onSelectedChange: (checked: boolean) => void
  onConsegna: () => void
  onAnnulla: () => void
}

export function ReceiptRow({
  receipt: r,
  selected,
  onSelectedChange,
  onConsegna,
  onAnnulla,
}: ReceiptRowProps) {
  const cancelled = r.delivery.cancelled
  const noEmail = !cancelled && !r.payerEmail?.trim()

  return (
    <li
      data-state={selected ? "selected" : undefined}
      className={cn(
        GRID,
        "border-b px-3 py-3 last:border-b-0 data-[state=selected]:bg-muted/50",
        cancelled && "opacity-70",
      )}
    >
      <div className="[grid-area:sel] self-start md:self-center">
        {/* La checkbox c'è anche sulle ricevute senza email: si selezionano,
            e la barra dice quante verranno saltate */}
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelectedChange(c === true)}
          aria-label={`Seleziona la ricevuta ${r.receiptNumber}`}
          className="size-5"
          disabled={cancelled}
        />
      </div>

      <div className="min-w-0 [grid-area:numero]">
        {/* Il numero è il nome di questa entità: è l'unico link della riga */}
        <Link
          href={receiptPdfHref(r.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-mono text-sm hover:underline"
        >
          {r.receiptNumber}
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          {formatDateShort(r.issueDate)}
        </p>
      </div>

      <div className="min-w-0 [grid-area:allieva]">
        <p className="truncate text-sm">{r.athleteName ?? "—"}</p>
      </div>

      <div className="min-w-0 [grid-area:pagante]">
        <p className="truncate text-sm text-muted-foreground">
          {r.payerName ?? "—"}
        </p>
        {noEmail ? (
          <p className="truncate text-xs text-muted-foreground">
            <Badge variant="secondary" className="mr-1 font-normal">
              Senza email
            </Badge>
            da dare a mano ·{" "}
            {r.payment?.athleteId ? (
              <Link
                href={`/admin/athletes/${r.payment.athleteId}?tab=anagrafica`}
                className="underline underline-offset-2"
              >
                aggiungi email
              </Link>
            ) : (
              "aggiungi email in anagrafica"
            )}
          </p>
        ) : null}
      </div>

      <div className="[grid-area:importo] md:text-right">
        <p className="font-mono text-sm">
          {r.amountCents !== null ? formatEur(r.amountCents) : "—"}
        </p>
      </div>

      <div className="[grid-area:stato] md:text-right">
        <Badge
          variant="outline"
          className={cn("font-normal", TONE[r.deliveryLabel.tone])}
        >
          {r.deliveryLabel.text}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 [grid-area:azioni] sm:flex-row md:justify-end">
        {!cancelled ? (
          <Button size="sm" className="h-11 md:h-9" onClick={onConsegna}>
            <Send className="h-4 w-4" />
            Consegna
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-9 md:w-9"
              aria-label="Altre azioni"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a
                href={receiptPdfHref(r.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="h-4 w-4" />
                Stampa
              </a>
            </DropdownMenuItem>
            {!cancelled ? (
              <DropdownMenuItem variant="destructive" onSelect={onAnnulla}>
                <X className="h-4 w-4" />
                Annulla ricevuta
              </DropdownMenuItem>
            ) : null}
            {r.payment?.athleteId ? (
              <DropdownMenuItem asChild>
                <Link href={`/admin/athletes/${r.payment.athleteId}?tab=contributi`}>
                  <UserCircle className="h-4 w-4" />
                  Apri scheda allieva
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
