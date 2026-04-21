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

import { AthleteForm } from "./athlete-form"

export function AthleteCreateDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Aggiungi allieva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi allieva</DialogTitle>
          <DialogDescription>
            Inserisci i dati anagrafici base. Collegherai i genitori
            successivamente dalla pagina dell&apos;allieva.
          </DialogDescription>
        </DialogHeader>
        <AthleteForm mode="create" onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
