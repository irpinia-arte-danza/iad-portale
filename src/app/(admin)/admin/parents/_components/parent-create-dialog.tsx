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

import { ParentForm } from "./parent-form"

export function ParentCreateDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Aggiungi genitore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi genitore</DialogTitle>
          <DialogDescription>
            Inserisci i dati base. Potrai completare l&apos;anagrafica più tardi.
          </DialogDescription>
        </DialogHeader>
        <ParentForm mode="create" onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
