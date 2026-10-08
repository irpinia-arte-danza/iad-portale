"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { MessageCircle, Send, X } from "lucide-react"

import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { Button } from "@/components/ui/button"
import type { AccessInvitePreview } from "@/lib/auth/access-emails"
import { planAccessInvites } from "@/lib/auth/access-invite-plan"
import type { AccessStatus } from "@/lib/auth/access-status-types"
import { cn } from "@/lib/utils"
import { listName } from "@/lib/utils/person-name"
import { whatsappHref } from "@/lib/utils/whatsapp"

import { AccessStatusBadge } from "../../_components/access/access-status-badge"
import { BulkAccessInviteDialog } from "../../_components/access/bulk-access-invite-dialog"
import { ParentRowActions } from "./parent-row-actions"

type ParentRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  receivesEmailCommunications: boolean
  remindersEnabled: boolean
  dateOfBirth: Date | null
  fiscalCode: string | null
  placeOfBirth: string | null
  provinceOfBirth: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  _count: { athleteRelations: number }
}

interface ParentsTableProps {
  parents: ParentRow[]
  accessStatuses: Record<string, AccessStatus>
  // Il testo dell'invito, per l'anteprima dell'invio di gruppo
  invitePreview: AccessInvitePreview
}

const FALLBACK_STATUS: AccessStatus = { kind: "NO_EMAIL" }

function figlieLabel(count: number): string {
  if (count === 0) return "nessuna allieva collegata"
  return count === 1 ? "1 allieva" : `${count} allieve`
}

// Il telefono si tocca: da iPad prima andava ricopiato a mano. Numero in
// Geist Mono, e WhatsApp apre la chat con quel numero.
// In card (`compact`) solo il numero: WhatsApp è il tasto della card.
function PhoneCell({ phone, compact = false }: { phone: string | null; compact?: boolean }) {
  if (!phone) return <span className="text-sm text-muted-foreground">—</span>
  const whatsapp = compact ? null : whatsappHref(phone)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <a
        href={`tel:${phone.replace(/\s+/g, "")}`}
        className={cn(
          "inline-flex items-center truncate font-mono text-sm underline-offset-4 hover:underline",
          !compact && "h-11",
        )}
      >
        {phone}
      </a>
      {whatsapp ? (
        <Button asChild variant="outline" size="sm" className="h-11 shrink-0">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            <span className="sr-only lg:not-sr-only">WhatsApp</span>
          </a>
        </Button>
      ) : null}
    </span>
  )
}

export function ParentsTable({
  parents,
  accessStatuses,
  invitePreview,
}: ParentsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunKey, setBulkRunKey] = useState(0)

  const statusOf = (id: string): AccessStatus =>
    accessStatuses[id] ?? FALLBACK_STATUS

  // Tutte le righe si selezionano, anche chi non può ricevere l'invito: chi
  // resta fuori lo dice l'anteprima, col motivo. Prima le righe non
  // invitabili non avevano la casella, e non si capiva perché.
  const selectableIds = useMemo(() => parents.map((p) => p.id), [parents])
  // Dopo un filtro o un aggiornamento una riga può non esserci più: la
  // selezione che conta è quella delle righe a schermo
  const selectedParents = useMemo(
    () => parents.filter((p) => selected.has(p.id)),
    [parents, selected],
  )
  // Nessuna regola nuova: decide isInvitable, come per il tasto di riga
  const plan = useMemo(
    () =>
      planAccessInvites(
        selectedParents.map((p) => ({
          id: p.id,
          name: listName(p),
          status: accessStatuses[p.id] ?? FALLBACK_STATUS,
        })),
      ),
    [selectedParents, accessStatuses],
  )

  function openBulk() {
    setBulkRunKey((key) => key + 1)
    setBulkOpen(true)
  }

  const selectedCount = selectedParents.length

  // ── Colonne ─────────────────────────────────────────────────────────────
  // Alta: nome, allieve collegate e stato dell'accesso. Telefono da 1024,
  // email da 1280. "Invia accesso" di riga sta nel menu ⋯: l'invito si fa
  // di gruppo, dalla selezione.
  const columns: ListColumn<ParentRow>[] = [
    {
      key: "nome",
      header: "Nome",
      width: "md:flex-1",
      cell: (parent) => (
        <Link
          href={`/admin/parents/${parent.id}`}
          className="truncate font-medium hover:underline"
        >
          {listName(parent)}
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      priority: "low",
      width: "md:w-56",
      cell: (parent) => (
        <span className="truncate text-sm">{parent.email || "—"}</span>
      ),
    },
    {
      key: "telefono",
      header: "Telefono",
      // Da 768: il numero è quello che serve su iPad. Sotto 1024 WhatsApp
      // resta un'icona, il testo compare quando c'è spazio
      width: "md:w-44 lg:w-64",
      cell: (parent) => <PhoneCell phone={parent.phone} />,
    },
    {
      key: "allieve",
      header: "Allieve",
      width: "md:w-14 lg:w-20",
      align: "center",
      cell: (parent) => (
        <span className="text-sm">{parent._count.athleteRelations}</span>
      ),
    },
    {
      key: "accesso",
      header: "Accesso",
      width: "md:w-32 lg:w-40",
      cell: (parent) => <AccessStatusBadge status={statusOf(parent.id)} />,
    },
  ]

  return (
    <>
      <ResponsiveList
        label="Genitori"
        items={parents}
        getId={(parent) => parent.id}
        columns={columns}
        empty={{
          title: "Nessun genitore trovato",
          hint: "Prova a modificare la ricerca o aggiungi il primo genitore.",
        }}
        selection={{
          selectableIds,
          selected,
          onSelectedChange: setSelected,
          rowLabel: (id) => {
            const parent = parents.find((p) => p.id === id)
            return parent ? `Seleziona ${listName(parent)}` : "Seleziona"
          },
          selectAllLabel: "Seleziona tutti i genitori dell'elenco",
        }}
        // Le due righe della card: le figlie (è il motivo per cui un genitore
        // è in anagrafica) e lo stato dell'accesso all'area riservata
        cardLines={(parent) => [
          <span key="figlie" className="flex flex-wrap items-center gap-1.5">
            {figlieLabel(parent._count.athleteRelations)}
            <AccessStatusBadge
              status={statusOf(parent.id)}
              showDetail={false}
            />
          </span>,
          <PhoneCell key="telefono" phone={parent.phone} compact />,
        ]}
        actions={(parent) => (
          <ParentRowActions
            layout="responsive"
            parent={parent}
            accessStatus={statusOf(parent.id)}
          />
        )}
      />

      {/* Barra fissa in basso: è da qui che si invitano le famiglie, non
          con decine di tocchi riga per riga. Niente parte da qui: si apre
          l'anteprima. */}
      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm text-muted-foreground">
            {selectedCount}{" "}
            {selectedCount === 1 ? "selezionato" : "selezionati"}
          </span>
          <div className="flex items-center gap-2">
            <Button className="h-11" onClick={openBulk}>
              <Send className="h-4 w-4" />
              Invia accesso a {selectedCount}{" "}
              {selectedCount === 1 ? "genitore" : "genitori"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelected(new Set())}
              aria-label="Deseleziona tutti"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BulkAccessInviteDialog
        key={bulkRunKey}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        plan={plan}
        preview={invitePreview}
        onFinished={() => setSelected(new Set())}
      />
    </>
  )
}
