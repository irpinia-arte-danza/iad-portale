"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Plus } from "lucide-react"
import type { PaymentMethod } from "@prisma/client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { ReceiptIssuePanel } from "../../receipts/_components/receipt-issue-panel"
import { useReceiptIssue } from "../../receipts/_components/use-receipt-issue"
import type { AthleteWithFormRelations, OpenScheduleOption } from "../queries"
import { PaymentForm } from "./payment-form"

interface PaymentCreateDialogProps {
  athletes: AthleteWithFormRelations[]
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
  // Incasso che arriva dalla ricerca: allieva già scelta, data di oggi e
  // ultimo metodo usato dalla famiglia. Il dialog è sempre questo, non uno
  // nuovo.
  preselect?: {
    athleteId: string
    method: PaymentMethod | null
  } | null
}

export function PaymentCreateDialog({
  athletes,
  openSchedulesByAthlete,
  preselect,
}: PaymentCreateDialogProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Con l'allieva già scelta il dialog è il motivo per cui si è arrivati
  // qui: si apre da solo
  const [open, setOpen] = useState(Boolean(preselect))
  const [registered, setRegistered] = useState(false)
  const receipt = useReceiptIssue()

  function handleOpenChange(next: boolean) {
    if (!next && receipt.state.phase === "issuing") return
    setOpen(next)
    if (!next) {
      setRegistered(false)
      receipt.reset()
      // Via il parametro dall'indirizzo: un refresh non deve riaprire
      // l'incasso di prima
      if (preselect) router.replace(pathname)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Registra pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {registered ? (
          <>
            {/* Scenario sportello: la famiglia è davanti, la ricevuta si emette subito */}
            <DialogHeader>
              <DialogTitle>Pagamento registrato</DialogTitle>
              <DialogDescription>
                Emetti la ricevuta adesso se la famiglia è presente, oppure più
                tardi dall&apos;elenco pagamenti.
              </DialogDescription>
            </DialogHeader>
            <ReceiptIssuePanel
              state={receipt.state}
              onConfirm={receipt.confirm}
              onClose={() => handleOpenChange(false)}
              dismissLabel="Chiudi senza ricevuta"
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Registra pagamento</DialogTitle>
              <DialogDescription>
                Seleziona l&apos;allieva e spunta le scadenze che sta pagando:
                anche più d&apos;una, con una sola ricevuta. Anno accademico e
                fiscale sono assegnati automaticamente.
              </DialogDescription>
            </DialogHeader>
            <PaymentForm
              key={preselect?.athleteId ?? "nuovo"}
              defaultValues={
                preselect
                  ? {
                      athleteId: preselect.athleteId,
                      ...(preselect.method ? { method: preselect.method } : {}),
                    }
                  : undefined
              }
              athletes={athletes}
              openSchedulesByAthlete={openSchedulesByAthlete}
              onSuccess={(paymentId) => {
                setRegistered(true)
                void receipt.begin(paymentId)
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
