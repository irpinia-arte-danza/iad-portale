"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

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
import type { AthleteWithFormRelations } from "../queries"
import { PaymentForm } from "./payment-form"

interface PaymentCreateDialogProps {
  athletes: AthleteWithFormRelations[]
}

export function PaymentCreateDialog({ athletes }: PaymentCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [registered, setRegistered] = useState(false)
  const receipt = useReceiptIssue()

  function handleOpenChange(next: boolean) {
    if (!next && receipt.state.phase === "issuing") return
    setOpen(next)
    if (!next) {
      setRegistered(false)
      receipt.reset()
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
                Seleziona l&apos;allieva, poi scegli il tipo di quota e l&apos;importo.
                Anno accademico e fiscale sono assegnati automaticamente.
              </DialogDescription>
            </DialogHeader>
            <PaymentForm
              athletes={athletes}
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
