"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Unlink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import type { AthleteParentRelation } from "../queries"
import { unlinkGuardian } from "../guardians-actions"
import { GuardianEditDialog } from "./guardian-edit-dialog"

interface GuardianRowActionsProps {
  athleteParent: AthleteParentRelation
  otherRelations: AthleteParentRelation[]
}

const RELATIONSHIP_LABELS: Record<
  AthleteParentRelation["relationship"],
  string
> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  GRANDPARENT: "Nonno/a",
  TUTOR: "Tutore",
  OTHER: "Altro",
}

export function GuardianRowActions({
  athleteParent,
  otherRelations,
}: GuardianRowActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkGuardian(athleteParent.id)
      if (result.ok) {
        toast.success("Genitore scollegato")
        setUnlinkOpen(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica relazione
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setUnlinkOpen(true)}
            variant="destructive"
          >
            <Unlink className="h-4 w-4" />
            Scollega
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GuardianEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        athleteParent={athleteParent}
        otherRelations={otherRelations}
        onSuccess={() => router.refresh()}
      />

      <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scollegare questo genitore?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;allieva non avrà più {athleteParent.parent.firstName}{" "}
              {athleteParent.parent.lastName} come{" "}
              {RELATIONSHIP_LABELS[athleteParent.relationship]}. Il genitore non
              viene eliminato dal sistema, può essere ricollegato in qualsiasi
              momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Scollegamento..." : "Scollega"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
