"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { ExpenseListItem } from "../queries"
import { ExpenseForm } from "./expense-form"

interface ExpenseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseListItem
  onSuccess?: () => void
}

export function ExpenseEditDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica spesa</DialogTitle>
          <DialogDescription>
            Aggiorna i dati della spesa. Anno fiscale e accademico vengono
            ricalcolati se cambi la data.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          mode="edit"
          expenseId={expense.id}
          defaultValues={{
            type: expense.type,
            method: expense.method,
            amountEur: expense.amountCents / 100,
            expenseDate: expense.expenseDate,
            description: expense.description,
            recipient: expense.recipient ?? "",
            notes: expense.notes ?? "",
          }}
          onSuccess={() => {
            onOpenChange(false)
            onSuccess?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
