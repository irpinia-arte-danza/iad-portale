"use client"

import { useState } from "react"
import { PencilLine } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  GuardianEditDialog,
  type GuardianEditRelation,
  type GuardianOtherRelation,
} from "../../athletes/_components/guardian-edit-dialog"

// «Modifica» su una figlia nella scheda genitore: lo stesso dialog della
// scheda allieva (grado di parentela e permessi), per questo genitore e
// questa figlia soltanto
export function ParentRelationEditButton({
  relation,
  otherRelations,
  athleteName,
}: {
  relation: GuardianEditRelation
  otherRelations: GuardianOtherRelation[]
  athleteName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-11 shrink-0 md:h-9"
        onClick={() => setOpen(true)}
        aria-label={`Modifica grado e permessi per ${athleteName}`}
      >
        <PencilLine className="h-4 w-4" />
        Modifica
      </Button>
      <GuardianEditDialog
        open={open}
        onOpenChange={setOpen}
        athleteParent={relation}
        otherRelations={otherRelations}
      />
    </>
  )
}
