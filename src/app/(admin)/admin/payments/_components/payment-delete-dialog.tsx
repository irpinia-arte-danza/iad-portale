"use client"

import { useTransition } from "react"
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

import { deletePayment } from "../actions"

interface PaymentDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: {
    id: string
    athleteName: string
  }
  onSuccess?: () => void
}

export function PaymentDeleteDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentDeleteDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePayment(payment.id)
      if (result.ok) {
        toast.success("Pagamento eliminato")
        onOpenChange(false)
        onSuccess?.()
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
              Eliminare definitivamente questo pagamento?
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          <p>
            Stai per eliminare il pagamento di{" "}
            <strong>{payment.athleteName}</strong>. Questa operazione{" "}
            <strong>non è la stessa cosa dello storno</strong>.
          </p>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Storna vs Elimina
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-foreground">Storna:</strong> il
                pagamento resta visibile in elenco come{" "}
                <em>Stornato</em>, utile per tracciare errori di cassa e
                contabilità (es. bonifico respinto).
              </li>
              <li>
                <strong className="text-destructive">Elimina:</strong> il
                pagamento sparisce dall&apos;elenco e dai report. Usa solo
                per <strong>errori di digitazione</strong> (es. importo
                sbagliato, allieva sbagliata).
              </li>
            </ul>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <p className="text-sm">
              <strong>Attenzione.</strong> Se il pagamento è collegato a una
              scadenza, la scadenza tornerà automaticamente a{" "}
              <em>Da pagare</em>. L&apos;eliminazione è un soft-delete: i
              dati restano nel database per audit, ma non saranno più
              visibili nell&apos;interfaccia.
            </p>
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
                Eliminazione…
              </>
            ) : (
              "Elimina definitivamente"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
