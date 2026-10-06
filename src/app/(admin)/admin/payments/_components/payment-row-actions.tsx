"use client"

import { useState } from "react"
import { FileText, Pencil, Printer, RotateCcw, Trash2 } from "lucide-react"

import {
  RowActionsRenderer,
  type RowAction,
  type RowActionsLayout,
} from "@/components/lists/row-actions"
import { receiptPdfHref } from "@/lib/receipts/types"
import type { PaymentStatus, ReceiptStatus } from "@prisma/client"

import { ReceiptIssueDialog } from "../../receipts/_components/receipt-issue-dialog"
import { useReceiptIssue } from "../../receipts/_components/use-receipt-issue"
import { PaymentDeleteDialog } from "./payment-delete-dialog"
import { PaymentEditDialog } from "./payment-edit-dialog"
import { PaymentReverseDialog } from "./payment-reverse-dialog"

interface PaymentRowActionsProps {
  payment: {
    id: string
    status: PaymentStatus
    notes: string | null
    athleteName: string
    receipt: {
      id: string
      receiptNumber: string
      status: ReceiptStatus
    } | null
    // Scadenze chiuse dal pagamento: lo storno le riapre tutte
    scheduleDescriptions: string[]
  }
  layout?: RowActionsLayout
}

export function PaymentRowActions({
  payment,
  layout,
}: PaymentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const receiptFlow = useReceiptIssue()

  const isReversed = payment.status === "REVERSED"
  const receipt = payment.receipt
  const receiptCancelled = receipt?.status === "CANCELLED"

  const actions: RowAction[] = [
    ...(receipt
      ? [
          {
            key: "receipt",
            label: receiptCancelled
              ? "Apri ricevuta annullata"
              : `Ristampa ricevuta n. ${receipt.receiptNumber}`,
            icon: Printer,
            href: receiptPdfHref(receipt.id),
            external: true,
          } satisfies RowAction,
        ]
      : !isReversed
        ? [
            {
              key: "issue",
              label: "Emetti ricevuta",
              icon: FileText,
              onSelect: () => receiptFlow.begin(payment.id),
            } satisfies RowAction,
          ]
        : []),
    {
      key: "notes",
      label: "Modifica note",
      icon: Pencil,
      separatorBefore: true,
      onSelect: () => setEditOpen(true),
    },
    ...(!isReversed
      ? [
          {
            key: "reverse",
            label: "Storna pagamento",
            icon: RotateCcw,
            destructive: true,
            onSelect: () => setReverseOpen(true),
          } satisfies RowAction,
        ]
      : []),
    receipt
      ? {
          key: "delete",
          label: "Elimina (ricevuta emessa: usa Storna)",
          icon: Trash2,
          disabled: true,
          separatorBefore: true,
        }
      : {
          key: "delete",
          label: "Elimina",
          icon: Trash2,
          destructive: true,
          separatorBefore: true,
          onSelect: () => setDeleteOpen(true),
        },
  ]

  return (
    <>
      <RowActionsRenderer actions={actions} layout={layout} />

      <PaymentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        payment={{
          id: payment.id,
          notes: payment.notes,
          athleteName: payment.athleteName,
        }}
      />

      <PaymentReverseDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        payment={{
          id: payment.id,
          athleteName: payment.athleteName,
          validReceiptNumber:
            receipt && !receiptCancelled ? receipt.receiptNumber : null,
          reopenSchedules: payment.scheduleDescriptions,
        }}
      />

      <PaymentDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        payment={{
          id: payment.id,
          athleteName: payment.athleteName,
        }}
      />

      <ReceiptIssueDialog
        state={receiptFlow.state}
        onConfirm={receiptFlow.confirm}
        onClose={receiptFlow.reset}
      />
    </>
  )
}
