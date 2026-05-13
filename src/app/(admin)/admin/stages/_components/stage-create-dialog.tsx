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

import { StageForm } from "./stage-form"

export function StageCreateDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuovo stage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo stage</DialogTitle>
          <DialogDescription>
            Crea un nuovo stage workshop. Lo associeremo all&apos;anno accademico
            corrente.
          </DialogDescription>
        </DialogHeader>
        <StageForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
