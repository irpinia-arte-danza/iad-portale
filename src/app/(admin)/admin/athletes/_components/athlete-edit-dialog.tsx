"use client"

import { useRouter } from "next/navigation"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { AthleteForm } from "./athlete-form"

// Dati anagrafici che il form di modifica precompila
export type EditableAthlete = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: "F" | "M" | "OTHER"
  email: string | null
  phone: string | null
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athlete: EditableAthlete
  linkedParents: number
  onSaved?: () => void
}

// "Modifica allieva", controllato dall'esterno. Stava dentro
// AthleteDetailHeader, ma lo apre anche il blocco "Da completare" per il passo
// dell'email: il form è uno solo, in un posto solo.
export function AthleteEditDialog({
  open,
  onOpenChange,
  athlete,
  linkedParents,
  onSaved,
}: Props) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          linkedParents={linkedParents}
          defaultValues={{
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            dateOfBirth: athlete.dateOfBirth,
            gender: athlete.gender,
            email: athlete.email ?? "",
            phone: athlete.phone ?? "",
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
            onOpenChange(false)
            router.refresh()
            onSaved?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
