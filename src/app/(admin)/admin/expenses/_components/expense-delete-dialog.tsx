"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EXPENSE_TYPE_LABELS } from "@/lib/schemas/expense"

import { deleteExpense } from "../actions"
import type { ExpenseListItem } from "../queries"

import { formatEuro } from "@/lib/utils/format"
interface ExpenseDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseListItem
  onSuccess?: () => void
}


const DATE_SHORT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseDeleteDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(expense.id)
      if (result.ok) {
        toast.success("Spesa spostata nel cestino")
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="pt-1.5">
              Spostare questa spesa nel cestino?
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-mono text-xs">
                {DATE_SHORT.format(expense.expenseDate)}
              </dd>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>{EXPENSE_TYPE_LABELS[expense.type]}</dd>
              <dt className="text-muted-foreground">Causale</dt>
              <dd className="truncate">{expense.description}</dd>
              <dt className="text-muted-foreground">Importo</dt>
              <dd className="font-mono font-semibold">
                {formatEuro(expense.amountCents)}
              </dd>
            </dl>
          </div>

          {/* Non è una cancellazione: la spesa va in Cestino › Spese e da lì
              si ripristina. Prima il testo diceva "definitivamente" e "non è
              possibile ripristinarla", ed erano false tutte e due. */}
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>La spesa sparisce dalla lista e dai report.</li>
              <li>
                Resta nel Cestino, sotto Spese: da lì si può ripristinare.
              </li>
              <li>
                Serve per gli errori di digitazione (fornitore sbagliato,
                duplicato, prova).
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Spostamento…
              </>
            ) : (
              "Sposta nel cestino"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
