"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EXPENSE_TYPE_LABELS,
} from "@/lib/schemas/expense"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"

import type { ExpenseListItem } from "../queries"
import { ExpenseEditDialog } from "./expense-edit-dialog"
import { ExpenseRowActions } from "./expense-row-actions"

interface ExpensesTableProps {
  expenses: ExpenseListItem[]
}

const CURRENCY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

const DATE_SHORT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ExpensesTable({ expenses }: ExpensesTableProps) {
  const [editExpense, setEditExpense] = useState<ExpenseListItem | null>(null)

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessuna spesa registrata ancora</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Modifica i filtri oppure registra la prima spesa.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo spesa</TableHead>
              <TableHead className="hidden sm:table-cell">Fornitore</TableHead>
              <TableHead className="hidden lg:table-cell">Causale</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead className="hidden md:table-cell">Metodo</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setEditExpense(e)}
              >
                <TableCell className="font-mono text-xs">
                  {DATE_SHORT.format(e.expenseDate)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {EXPENSE_TYPE_LABELS[e.type]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {e.recipient ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell lg:max-w-xs truncate text-sm text-muted-foreground">
                  {e.description}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {CURRENCY.format(e.amountCents / 100)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[e.method]}
                </TableCell>
                <TableCell onClick={(evt) => evt.stopPropagation()}>
                  <ExpenseRowActions expense={e} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editExpense && (
        <ExpenseEditDialog
          open={Boolean(editExpense)}
          onOpenChange={(open) => {
            if (!open) setEditExpense(null)
          }}
          expense={editExpense}
        />
      )}
    </>
  )
}
