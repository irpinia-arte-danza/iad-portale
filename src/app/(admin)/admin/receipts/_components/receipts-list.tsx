"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { bulkSelectionSummary } from "@/lib/receipts/delivery"

import type { ReceiptListRow } from "../queries"
import { BulkSendReceiptsDialog } from "./bulk-send-receipts-dialog"
import { ReceiptCancelDialog } from "./receipt-cancel-dialog"
import { ReceiptEmailActions } from "./receipt-email-actions"
import { ReceiptRow } from "./receipt-row"

type Props = {
  items: ReceiptListRow[]
  quota: { sentToday: number; remaining: number; limit: number }
}

export function ReceiptsList({ items, quota }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deliverTarget, setDeliverTarget] = useState<ReceiptListRow | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReceiptListRow | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunKey, setBulkRunKey] = useState(0)

  const selectableIds = useMemo(
    () => items.filter((r) => !r.delivery.cancelled).map((r) => r.id),
    [items],
  )
  const selectedRows = useMemo(
    () => items.filter((r) => selected.has(r.id)),
    [items, selected],
  )

  // Senza email si consegnano a mano: restano selezionabili, ma dalla
  // selezione non parte niente per loro, e la barra lo dice
  const sendable = selectedRows.filter((r) => r.emailBlocker === null)
  const summary = bulkSelectionSummary(selectedRows)

  const allChecked =
    selectableIds.length > 0 && selected.size === selectableIds.length
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : selected.size > 0
      ? "indeterminate"
      : false

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessuna ricevuta</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Nessuna ricevuta con questo filtro.
        </p>
      </div>
    )
  }

  return (
    <>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox
          checked={headerChecked}
          onCheckedChange={(c) =>
            setSelected(c === true ? new Set(selectableIds) : new Set())
          }
          aria-label="Seleziona tutte"
          className="size-5"
        />
        Seleziona tutte ({selectableIds.length})
      </label>

      <ul className="rounded-md border">
        {items.map((r) => (
          <ReceiptRow
            key={r.id}
            receipt={r}
            selected={selected.has(r.id)}
            onSelectedChange={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev)
                if (checked) next.add(r.id)
                else next.delete(r.id)
                return next
              })
            }
            onConsegna={() => setDeliverTarget(r)}
            onAnnulla={() => setCancelTarget(r)}
          />
        ))}
      </ul>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {selected.size}{" "}
              {selected.size === 1 ? "ricevuta" : "ricevute"} selezionate
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="h-11 flex-1 sm:flex-none"
              disabled={sendable.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              Anteprima e invia {sendable.length}{" "}
              {sendable.length === 1 ? "email" : "email"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setSelected(new Set())}
              aria-label="Annulla la selezione"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lo stesso pannello che compare dopo l'emissione (#30) */}
      <Dialog
        open={deliverTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeliverTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          {deliverTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Consegna la ricevuta n. {deliverTarget.receiptNumber}
                </DialogTitle>
                <DialogDescription>
                  {deliverTarget.athleteName ?? "—"} ·{" "}
                  {deliverTarget.payerName ?? "pagante non indicato"}
                </DialogDescription>
              </DialogHeader>
              <ReceiptEmailActions
                receiptId={deliverTarget.id}
                receiptNumber={deliverTarget.receiptNumber}
                athleteName={deliverTarget.athleteName ?? ""}
                status={deliverTarget.status}
                payerName={deliverTarget.payerName}
                payerEmail={deliverTarget.payerEmail}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {cancelTarget ? (
        <ReceiptCancelDialog
          open
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null)
          }}
          receiptNumber={cancelTarget.receiptNumber}
          athleteName={cancelTarget.athleteName}
          athleteId={cancelTarget.payment?.athleteId ?? null}
        />
      ) : null}

      <BulkSendReceiptsDialog
        key={bulkRunKey}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        targets={sendable.map((r) => ({ id: r.id, label: r.receiptNumber }))}
        quota={quota}
        onFinished={() => {
          setSelected(new Set())
          setBulkRunKey((k) => k + 1)
        }}
      />
    </>
  )
}
