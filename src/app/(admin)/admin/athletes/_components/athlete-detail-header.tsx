"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

import { softDeleteAthlete } from "../actions"
import { AthleteForm } from "./athlete-form"

interface AthleteDetailHeaderProps {
  athlete: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date
    gender: "F" | "M" | "OTHER"
    fiscalCode: string | null
    placeOfBirth: string | null
    provinceOfBirth: string | null
    residenceStreet: string | null
    residenceNumber: string | null
    residenceCity: string | null
    residenceProvince: string | null
    residenceCap: string | null
    instructorNotes: string | null
  }
}

export function AthleteDetailHeader({ athlete }: AthleteDetailHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteAthlete(athlete.id)
      if (result.ok) {
        toast.success("Allieva eliminata")
        router.push("/admin/athletes")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Modifica
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Elimina
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica allieva</DialogTitle>
            <DialogDescription>
              Aggiorna i dati di {athlete.firstName} {athlete.lastName}.
            </DialogDescription>
          </DialogHeader>
          <AthleteForm
            mode="edit"
            athleteId={athlete.id}
            defaultValues={{
              firstName: athlete.firstName,
              lastName: athlete.lastName,
              dateOfBirth: athlete.dateOfBirth,
              gender: athlete.gender,
              fiscalCode: athlete.fiscalCode ?? "",
              placeOfBirth: athlete.placeOfBirth ?? "",
              provinceOfBirth: athlete.provinceOfBirth ?? "",
              residenceStreet: athlete.residenceStreet ?? "",
              residenceNumber: athlete.residenceNumber ?? "",
              residenceCity: athlete.residenceCity ?? "",
              residenceProvince: athlete.residenceProvince ?? "",
              residenceCap: athlete.residenceCap ?? "",
              instructorNotes: athlete.instructorNotes ?? "",
            }}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa allieva?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {athlete.firstName} {athlete.lastName}.
              L&apos;operazione è reversibile (soft delete) ma l&apos;allieva non sarà
              più visibile nell&apos;elenco. I genitori collegati restano intatti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
