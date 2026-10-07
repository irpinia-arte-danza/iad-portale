"use client"

import * as React from "react"
import { Loader2, ShieldOff } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { logError } from "@/lib/logging/log-error"

import { resetAdminSecondFactor } from "../actions"

// «Azzera il secondo fattore» per l'altro admin: conferma esplicita, poi
// l'azione toglie i fattori in Supabase e i codici di recupero e lo scrive
// nell'audit. Al login successivo quell'admin rifà l'iscrizione.
export function ResetSecondFactorButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function onConfirm() {
    setBusy(true)
    try {
      const result = await resetAdminSecondFactor(userId)
      if (result.ok) {
        toast.success(`Secondo fattore azzerato: ${name} lo ricollegherà al prossimo accesso`)
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      logError("[settings] reset second factor", error)
      toast.error("Non è stato possibile azzerare il secondo fattore, riprova")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9">
          <ShieldOff className="mr-2 h-4 w-4" />
          Azzera il secondo fattore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Azzerare il secondo fattore di {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;app collegata e i codici di recupero smettono di valere. Al prossimo
            accesso, dopo la password, {name} dovrà collegare di nuovo l&apos;app e riceverà
            otto codici nuovi. L&apos;operazione resta scritta nel registro attività.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Azzera
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
