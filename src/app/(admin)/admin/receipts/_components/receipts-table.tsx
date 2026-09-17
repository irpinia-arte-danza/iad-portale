"use client"

import Link from "next/link"
import { unstable_rethrow } from "next/navigation"
import { useMemo, useState } from "react"
import { Check, Download, Loader2, Mail, Printer, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { wasSent } from "@/lib/receipts/receipt-email"
import { receiptPdfDownloadHref, receiptPdfHref } from "@/lib/receipts/types"
import { formatDateShort, formatEur } from "@/lib/utils/format"

import { sendReceiptByEmail } from "../actions"
import type { ReceiptListRow } from "../queries"
import { BulkSendReceiptsDialog } from "./bulk-send-receipts-dialog"
import { ShareReceiptButton } from "./share-receipt-button"

type Props = {
  items: ReceiptListRow[]
  quota: { sentToday: number; remaining: number; limit: number }
}

export function ReceiptsTable({ items, quota }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRunKey, setBulkRunKey] = useState(0)

  // Selezionabili solo le ricevute che si possono davvero mandare: valide e
  // con l'email del pagante congelata sul documento
  const sendableIds = useMemo(
    () => items.filter((r) => r.emailBlocker === null).map((r) => r.id),
    [items],
  )

  const effectiveSelected = useMemo(
    () => sendableIds.filter((id) => selected.has(id)),
    [sendableIds, selected],
  )

  const allChecked =
    sendableIds.length > 0 && effectiveSelected.length === sendableIds.length
  const someChecked = effectiveSelected.length > 0 && !allChecked
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : someChecked
      ? "indeterminate"
      : false

  function toggleAll(checked: boolean | "indeterminate") {
    setSelected(checked === true ? new Set(sendableIds) : new Set())
  }

  function toggleOne(id: string, checked: boolean | "indeterminate") {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked === true) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function sendOne(row: ReceiptListRow) {
    setSendingId(row.id)
    try {
      const result = await sendReceiptByEmail(row.id)
      if (result.ok) toast.success(`Ricevuta ${row.receiptNumber} inviata a ${result.recipient}`)
      else toast.error(result.error)
    } catch (error) {
      unstable_rethrow(error)
      toast.error("Invio non riuscito: controlla la connessione e riprova")
    } finally {
      setSendingId(null)
    }
  }

  const targets = items
    .filter((r) => effectiveSelected.includes(r.id))
    .map((r) => ({ id: r.id, label: r.receiptNumber }))

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
                  disabled={sendableIds.length === 0}
                  aria-label="Seleziona le ricevute inviabili"
                />
              </TableHead>
              <TableHead>Numero</TableHead>
              <TableHead className="hidden sm:table-cell">Emessa il</TableHead>
              <TableHead>Allieva</TableHead>
              <TableHead className="hidden lg:table-cell">Pagante</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[150px]">
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const cancelled = r.status === "CANCELLED"
              const sent = wasSent(r.emailState)
              const sendable = r.emailBlocker === null
              const busy = sendingId === r.id

              return (
                <TableRow
                  key={r.id}
                  data-state={selected.has(r.id) && sendable ? "selected" : undefined}
                >
                  <TableCell>
                    {sendable ? (
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(c) => toggleOne(r.id, c)}
                        aria-label={`Seleziona ricevuta ${r.receiptNumber}`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={
                      cancelled
                        ? "font-mono text-xs text-muted-foreground line-through"
                        : "font-mono text-xs font-medium"
                    }
                  >
                    {r.receiptNumber}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs">
                    {formatDateShort(r.issueDate)}
                  </TableCell>
                  <TableCell>
                    {r.payment ? (
                      <Link
                        href={`/admin/athletes/${r.payment.athleteId}`}
                        className="hover:underline"
                      >
                        {r.athleteName ?? "—"}
                      </Link>
                    ) : (
                      (r.athleteName ?? "—")
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {r.payerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatEur(r.amountCents ?? r.payment?.amountCents ?? 0)}
                  </TableCell>
                  <TableCell>
                    {cancelled ? (
                      <Badge variant="destructive">Annullata</Badge>
                    ) : (
                      <Badge variant="outline">Valida</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {sent ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                            {formatDateShort(r.emailState.lastSentAt!)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Inviata a {r.emailState.lastRecipient}
                          {r.emailState.sendCount > 1
                            ? ` · ${r.emailState.sendCount} invii`
                            : ""}
                        </TooltipContent>
                      </Tooltip>
                    ) : r.emailBlocker ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground">
                            Non inviabile
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {r.emailBlocker}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-amber-700 dark:text-amber-500">
                        Da inviare
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={receiptPdfHref(r.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Apri PDF ricevuta ${r.receiptNumber}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Printer className="h-4 w-4" />
                      </a>
                      <a
                        href={receiptPdfDownloadHref(r.id)}
                        aria-label={`Scarica PDF ricevuta ${r.receiptNumber}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <ShareReceiptButton
                        receiptId={r.id}
                        receiptNumber={r.receiptNumber}
                        athleteName={r.athleteName ?? ""}
                        variant="icon"
                      />
                      {sendable ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => sendOne(r)}
                          disabled={busy}
                          aria-label={
                            sent
                              ? `Invia di nuovo la ricevuta ${r.receiptNumber}`
                              : `Invia per email la ricevuta ${r.receiptNumber}`
                          }
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : sent ? (
                            <RefreshCw className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {effectiveSelected.length > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm font-medium">
            {effectiveSelected.length}{" "}
            {effectiveSelected.length === 1
              ? "ricevuta selezionata"
              : "ricevute selezionate"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              <Mail className="h-4 w-4" />
              Invia le selezionate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              aria-label="Deseleziona tutte"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BulkSendReceiptsDialog
        key={bulkRunKey}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        targets={targets}
        quota={quota}
        onFinished={() => {
          setSelected(new Set())
          setBulkRunKey((k) => k + 1)
        }}
      />
    </>
  )
}
