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

import { ShowcaseForm } from "./showcase-form"

type Props = {
  academicYearId: string
}

export function ShowcaseCreateDialog({ academicYearId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Crea saggio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo saggio</DialogTitle>
          <DialogDescription>
            Un saggio per anno accademico. Le partecipazioni si gestiscono
            dalla scheda dopo la creazione.
          </DialogDescription>
        </DialogHeader>
        <ShowcaseForm
          mode="create"
          academicYearId={academicYearId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
