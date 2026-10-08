"use client"

import Link from "next/link"
import {
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  UserCircle,
  UserPlus,
  Wallet,
} from "lucide-react"

import { AthleteCardLink } from "@/components/athletes/athlete-card-link"
import { AmountOffReference } from "@/components/payments/amount-off-reference"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { associationFeeDescription } from "@/lib/fees/association-fee-label"
import { dueLabel } from "@/lib/scadenze/due-label"
import { TONE_BADGE } from "@/lib/status/tone"
import { reminderSummaryLabel } from "@/lib/scadenze/reminder-trace"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import type { ScadenzaWithDetails } from "../queries"

// ─────────────────────────────────────────────────────────────────────────
// Una scadenza, su una riga sola dove c'è spazio.
//
// Era una tabella con dieci colonne: a 1440 px le ultime finivano fuori
// schermo, su iPad si vedevano allieva, contatto, corso e metà importo, e
// Incassa e Sollecita stavano nel menu ⋯ dell'ultima colonna, cioè fuori.
// Qui le aree sono fisse e si ridispongono: una riga da 1024 in su, due righe
// su tablet, una card sul telefono. Da 768 le due azioni si vedono sempre;
// sul telefono, come nelle altre liste, c'è un tasto solo (Incassa) e il
// resto, Sollecita compreso, sta nel menu «…» da 44 px: con i tre tasti
// impilati 58 scadenze erano 18.000 px di pagina.
// ─────────────────────────────────────────────────────────────────────────

const GRID = cn(
  "grid items-center gap-x-3 gap-y-2",
  // Telefono: nome e importo sulla prima riga, pagante e scadenza sulla
  // seconda, e le azioni larghe quanto la card
  "grid-cols-[auto_minmax(0,1fr)_auto]",
  // "vuoto" e non ".": Tailwind mangia l'underscore dopo il punto e il
  // template uscirebbe con una riga da due celle invece di tre, cioè invalido
  "[grid-template-areas:'sel_nome_importo'_'vuoto_pagante_scadenza'_'azioni_azioni_azioni']",
  // Tablet: due righe, il pagante sotto il nome
  "md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]",
  "md:[grid-template-areas:'sel_nome_importo_scadenza_azioni'_'sel_pagante_pagante_pagante_azioni']",
  // Da 1024: tutto su una riga
  "lg:grid-cols-[auto_minmax(0,11rem)_minmax(0,1fr)_auto_auto_auto]",
  "lg:[grid-template-areas:'sel_nome_pagante_importo_scadenza_azioni']",
)

interface ScadenzaRowProps {
  scadenza: ScadenzaWithDetails
  selected: boolean
  onSelectedChange: (checked: boolean) => void
  onIncassa: () => void
  onSollecita: () => void
  onEditAmount: () => void
}

export function ScadenzaRow({
  scadenza: s,
  selected,
  onSelectedChange,
  onIncassa,
  onSollecita,
  onEditAmount,
}: ScadenzaRowProps) {
  const contact = s.contact
  const due = dueLabel(s.dueDate, new Date())
  const causale =
    s.course?.name ??
    (s.feeType === "ASSOCIATION"
      ? associationFeeDescription(s.academicYear.label)
      : (s.notes ?? "Contributo"))
  // Senza email e senza telefono non c'è nessuno da sollecitare: il tasto
  // resta, spento, e dice perché
  const canRemind = Boolean(contact?.email || contact?.phone)
  const remindBlocker = !contact
    ? "Nessun genitore collegato"
    : "Il contatto non ha né email né telefono"

  return (
    <li
      data-state={selected ? "selected" : undefined}
      className={cn(
        GRID,
        "border-b px-3 py-3 last:border-b-0 data-[state=selected]:bg-muted/50 max-md:py-2",
      )}
    >
      <div className="[grid-area:sel] self-start md:self-center">
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelectedChange(c === true)}
          aria-label={`Seleziona la scadenza di ${s.athlete.lastName} ${s.athlete.firstName}`}
          className="size-5"
        />
      </div>

      <div className="min-w-0 [grid-area:nome]">
        {/* Unico link della riga: il resto non è cliccabile */}
        {/* Da 1024 in su apre la scheda nel pannello, con la lista dietro */}
        <AthleteCardLink
          athleteId={s.athlete.id}
          className="block truncate font-medium hover:underline"
        >
          {s.athlete.lastName} {s.athlete.firstName}
        </AthleteCardLink>
        <p className="truncate text-xs text-muted-foreground">{causale}</p>
      </div>

      <div className="min-w-0 [grid-area:pagante]">
        {contact ? (
          <>
            <p className="truncate text-sm">
              {contact.name}
              {contact.isAthlete ? (
                <span className="text-muted-foreground"> (allieva)</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {reminderSummaryLabel(s.reminders)}
            </p>
          </>
        ) : (
          <>
            {/* Rosso: senza genitore non si manda né ricevuta né sollecito */}
            <p className="truncate text-sm text-status-block">
              Nessun genitore collegato
            </p>
            <Link
              href={`/admin/athletes/${s.athlete.id}`}
              className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
            >
              <UserPlus className="h-3 w-3" />
              Collega un genitore
            </Link>
          </>
        )}
      </div>

      <div className="text-right [grid-area:importo]">
        <p className="font-mono text-sm font-medium">
          {formatEuro(s.amountCents)}
        </p>
        <AmountOffReference
          amountCents={s.amountCents}
          referenceAmountCents={
            s.feeType === "MONTHLY" && s.course
              ? s.course.monthlyFeeCents
              : null
          }
          isPaid={s.status === "PAID"}
          className="text-xs"
        />
      </div>

      <div className="text-right [grid-area:scadenza]">
        <p className="font-mono text-xs text-muted-foreground">
          {formatDateShort(s.dueDate)}
        </p>
        <Badge
          variant="outline"
          className={cn("mt-0.5 font-normal", TONE_BADGE[due.tone])}
        >
          {due.text}
        </Badge>
      </div>

      <div className="flex items-center gap-2 [grid-area:azioni] md:justify-end">
        <Button
          size="sm"
          className="h-11 flex-1 md:h-9 md:flex-none"
          onClick={onIncassa}
        >
          <Wallet className="h-4 w-4" />
          Incassa
        </Button>
        <Button
          size="sm"
          variant="outline"
          // Sul telefono è nel menu «…»
          className="hidden h-11 md:inline-flex md:h-9"
          onClick={onSollecita}
          disabled={!canRemind}
          title={canRemind ? undefined : remindBlocker}
        >
          <MessageCircle className="h-4 w-4" />
          Sollecita
        </Button>
        {/* Quello che si fa di rado: l'importo da correggere e la scheda.
            Le due azioni che contano restano fuori dal menu. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* La misura la decide la variante: 44 col dito, 32 col mouse */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Altre azioni"
              className="max-md:size-11 max-md:shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Solo sul telefono, e solo se c'è qualcuno da sollecitare: una
                voce spenta su ogni riga è rumore, e il motivo è già scritto
                in rosso nella card */}
            {canRemind ? (
              <DropdownMenuItem className="md:hidden" onSelect={onSollecita}>
                <MessageCircle className="h-4 w-4" />
                Sollecita
              </DropdownMenuItem>
            ) : null}
            {s.status !== "PAID" ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  onEditAmount()
                }}
              >
                <PencilLine className="h-4 w-4" />
                Modifica importo
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href={`/admin/athletes/${s.athlete.id}`}>
                <UserCircle className="h-4 w-4" />
                Apri scheda allieva
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
