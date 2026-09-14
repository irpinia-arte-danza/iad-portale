"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  isInvitable,
  type AccessStatus,
} from "@/lib/auth/access-status-types"

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

export function ParentsTable({ parents, accessStatuses }: ParentsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunKey, setBulkRunKey] = useState(0)
  const [bulkTargets, setBulkTargets] = useState<{ id: string; name: string }[]>([])

  const statusOf = (id: string): AccessStatus => accessStatuses[id] ?? FALLBACK_STATUS

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

  const allChecked =
    selectableIds.length > 0 && effectiveSelected.length === selectableIds.length
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : effectiveSelected.length > 0
      ? "indeterminate"
      : false

  function toggleAll(checked: boolean | "indeterminate") {
    setSelected(checked === true ? new Set(selectableIds) : new Set())
  }

  function toggleOne(id: string, checked: boolean | "indeterminate") {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked === true) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openBulk() {
    const byId = new Map(parents.map((p) => [p.id, p]))
    setBulkTargets(
      effectiveSelected.flatMap((id) => {
        const parent = byId.get(id)
        return parent
          ? [{ id, name: `${parent.lastName} ${parent.firstName}` }]
          : []
      }),
    )
    setBulkRunKey((key) => key + 1)
    setBulkOpen(true)
  }

  if (parents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessun genitore trovato</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova a modificare la ricerca o aggiungi il primo genitore.
        </p>
      </div>
    )
  }

  const selectedCount = effectiveSelected.length

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Seleziona tutti i genitori a cui si può inviare l'accesso"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telefono</TableHead>
              <TableHead className="text-center">Allieve</TableHead>
              <TableHead>Accesso</TableHead>
              <TableHead className="hidden lg:table-cell">
                <span className="sr-only">Invio accesso</span>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {parents.map((parent) => {
              const status = statusOf(parent.id)
              const invitable = isInvitable(status)
              const isSelected = invitable && selected.has(parent.id)

              return (
                <TableRow
                  key={parent.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="hover:bg-muted/50"
                >
                  <TableCell>
                    {invitable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggleOne(parent.id, c)}
                        aria-label={`Seleziona ${parent.lastName} ${parent.firstName}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/parents/${parent.id}`}
                      className="block hover:underline"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {parent.lastName} {parent.firstName}
                        </span>
                        <span className="sm:hidden truncate max-w-[200px] text-xs text-muted-foreground">
                          {parent.email || parent.phone || "—"}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                    {parent.email || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {parent.phone || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {parent._count.athleteRelations}
                  </TableCell>
                  <TableCell>
                    <AccessStatusBadge status={status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <SendAccessButton
                      kind="PARENT"
                      profileId={parent.id}
                      status={status}
                    />
                  </TableCell>
                  <TableCell>
                    <ParentRowActions parent={parent} accessStatus={status} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm font-medium">
            {selectedCount}{" "}
            {selectedCount === 1 ? "genitore selezionato" : "genitori selezionati"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openBulk}>
              <Send className="h-4 w-4" />
              Invia accesso ai selezionati
            </Button>
            <Button
              variant="ghost"
              size="sm"
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
