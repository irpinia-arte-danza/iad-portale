"use client"

import { useState } from "react"
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
}

export function PaymentRowActions({ payment }: PaymentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const receiptFlow = useReceiptIssue()

  const isReversed = payment.status === "REVERSED"
  const receipt = payment.receipt
  const receiptCancelled = receipt?.status === "CANCELLED"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Azioni"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {receipt ? (
            <DropdownMenuItem asChild>
              <a
                href={receiptPdfHref(receipt.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="h-4 w-4" />
                {receiptCancelled
                  ? "Apri ricevuta annullata"
                  : `Ristampa ricevuta n. ${receipt.receiptNumber}`}
              </a>
            </DropdownMenuItem>
          ) : !isReversed ? (
            <DropdownMenuItem onClick={() => receiptFlow.begin(payment.id)}>
              <FileText className="h-4 w-4" />
              Emetti ricevuta
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica note
          </DropdownMenuItem>
          {!isReversed && (
            <DropdownMenuItem
              onClick={() => setReverseOpen(true)}
              variant="destructive"
            >
              <RotateCcw className="h-4 w-4" />
              Storna pagamento
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {receipt ? (
            <DropdownMenuItem disabled>
              <Trash2 className="h-4 w-4" />
              Elimina (ricevuta emessa: usa Storna)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" />
              Elimina
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
