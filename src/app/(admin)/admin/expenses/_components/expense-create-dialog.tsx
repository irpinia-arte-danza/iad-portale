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

import { ExpenseForm } from "./expense-form"

export function ExpenseCreateDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Registra spesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registra spesa</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli della spesa. Anno fiscale e accademico sono
            assegnati automaticamente in base alla data.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
