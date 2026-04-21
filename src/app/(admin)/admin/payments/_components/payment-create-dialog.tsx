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

import type { AthleteWithFormRelations } from "../queries"
import { PaymentForm } from "./payment-form"

interface PaymentCreateDialogProps {
  athletes: AthleteWithFormRelations[]
}

export function PaymentCreateDialog({ athletes }: PaymentCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Registra pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registra pagamento</DialogTitle>
          <DialogDescription>
            Seleziona l&apos;allieva, poi scegli il tipo di quota e l&apos;importo.
            Anno accademico e fiscale sono assegnati automaticamente.
          </DialogDescription>
        </DialogHeader>
        <PaymentForm athletes={athletes} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
