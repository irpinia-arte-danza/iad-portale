"use client"

import { useRouter } from "next/navigation"
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
  const router = useRouter()
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
            Inserisci i dati anagrafici base. Appena salvi si apre la sua
            scheda, con l&apos;elenco di quello che resta da completare:
            genitore, corso, certificato e tessera.
          </DialogDescription>
        </DialogHeader>
        <AthleteForm
          mode="create"
          onSuccess={(athleteId) => {
            setOpen(false)
            // Dalla lista alla scheda appena creata: è lì che si completa
            if (athleteId) router.push(`/admin/athletes/${athleteId}`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
