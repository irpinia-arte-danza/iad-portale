"use client"

import { useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

import { MedicalCertFormDialog } from "./medical-cert-form-dialog"

// Il certificato si carica da dove si scopre che manca, senza scorrere fino
// alla sua sezione: stesso dialog, aperto da qui.
export function MedicalCertUploadButton({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" />
        Carica
      </Button>
      <MedicalCertFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        athleteId={athleteId}
      />
    </>
  )
}
