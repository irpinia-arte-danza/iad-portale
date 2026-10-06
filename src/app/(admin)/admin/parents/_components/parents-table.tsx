"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Send, X } from "lucide-react"

import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { Button } from "@/components/ui/button"
import {
  isInvitable,
  type AccessStatus,
} from "@/lib/auth/access-status-types"
import { listName } from "@/lib/utils/person-name"

import { AccessStatusBadge } from "../../_components/access/access-status-badge"
import { BulkAccessInviteDialog } from "../../_components/access/bulk-access-invite-dialog"
import { SendAccessButton } from "../../_components/access/send-access-button"
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
}

const FALLBACK_STATUS: AccessStatus = { kind: "NO_EMAIL" }

function figlieLabel(count: number): string {
  if (count === 0) return "nessuna allieva collegata"
  return count === 1 ? "1 allieva" : `${count} allieve`
}

export function ParentsTable({ parents, accessStatuses }: ParentsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunKey, setBulkRunKey] = useState(0)
  const [bulkTargets, setBulkTargets] = useState<{ id: string; name: string }[]>([])

  const statusOf = (id: string): AccessStatus =>
    accessStatuses[id] ?? FALLBACK_STATUS

  // Selezionabili solo MAI INVITATO / INVITATO. Dopo un aggiornamento un
  // genitore può non esserlo più (es. ha attivato l'accesso): la selezione
  // effettiva ignora gli id non più validi.
  const selectableIds = useMemo(
    () =>
      parents
        .filter((p) => isInvitable(accessStatuses[p.id] ?? FALLBACK_STATUS))
        .map((p) => p.id),
    [parents, accessStatuses],
  )
  const effectiveSelected = useMemo(
    () => selectableIds.filter((id) => selected.has(id)),
    [selectableIds, selected],
  )

  function openBulk() {
    const byId = new Map(parents.map((p) => [p.id, p]))
    setBulkTargets(
      effectiveSelected.flatMap((id) => {
        const parent = byId.get(id)
        return parent ? [{ id, name: listName(parent) }] : []
      }),
    )
    setBulkRunKey((key) => key + 1)
    setBulkOpen(true)
  }

  const selectedCount = effectiveSelected.length

  // ── Colonne ─────────────────────────────────────────────────────────────
  // Alta: nome, allieve collegate e stato dell'accesso. Email e telefono
  // arrivano da 1024, il tasto "Invia accesso" da 1280 (in card e su iPad
  // sta nel menu delle azioni).
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
      priority: "medium",
      width: "md:w-56",
      cell: (parent) => (
        <span className="truncate text-sm">{parent.email || "—"}</span>
      ),
    },
    {
      key: "telefono",
      header: "Telefono",
      priority: "low",
      width: "md:w-36",
      cell: (parent) => (
        <span className="truncate font-mono text-sm">
          {parent.phone || "—"}
        </span>
      ),
    },
    {
      key: "allieve",
      header: "Allieve",
      width: "md:w-20",
      align: "center",
      cell: (parent) => (
        <span className="text-sm">{parent._count.athleteRelations}</span>
      ),
    },
    {
      key: "accesso",
      header: "Accesso",
      width: "md:w-40",
      cell: (parent) => <AccessStatusBadge status={statusOf(parent.id)} />,
    },
    {
      key: "invia",
      header: <span className="sr-only">Invio accesso</span>,
      priority: "low",
      width: "md:w-36",
      cell: (parent) => (
        <SendAccessButton
          kind="PARENT"
          profileId={parent.id}
          status={statusOf(parent.id)}
        />
      ),
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
          selectAllLabel:
            "Seleziona tutti i genitori a cui si può inviare l'accesso",
        }}
        // Le due righe della card: le figlie (è il motivo per cui un genitore
        // è in anagrafica) e lo stato dell'accesso all'area riservata
        cardLines={(parent) => [
          <span key="figlie">
            {figlieLabel(parent._count.athleteRelations)}
            {parent.email ? ` · ${parent.email}` : " · senza email"}
          </span>,
          <span key="accesso" className="flex items-center gap-1.5">
            <AccessStatusBadge
              status={statusOf(parent.id)}
              showDetail={false}
            />
          </span>,
        ]}
        actions={(parent) => (
          <ParentRowActions
            layout="responsive"
            parent={parent}
            accessStatus={statusOf(parent.id)}
          />
        )}
      />

      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm font-medium">
            {selectedCount}{" "}
            {selectedCount === 1
              ? "genitore selezionato"
              : "genitori selezionati"}
          </span>
          <div className="flex items-center gap-2">
            <Button className="h-11" onClick={openBulk}>
              <Send className="h-4 w-4" />
              Invia accesso ai selezionati
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
        targets={bulkTargets}
        onFinished={() => setSelected(new Set())}
      />
    </>
  )
}
