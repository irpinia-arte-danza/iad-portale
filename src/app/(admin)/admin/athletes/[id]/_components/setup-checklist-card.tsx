"use client"

import * as React from "react"
import {
  BookOpen,
  IdCard,
  Mail,
  Stethoscope,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SetupStep, SetupStepId } from "@/lib/athletes/setup-checklist"

import {
  AthleteEditDialog,
  type EditableAthlete,
} from "../../_components/athlete-edit-dialog"
import {
  EnrollCourseDialog,
  type ActiveCourse,
  type EnrollmentAcademicYear,
} from "../../_components/enroll-course-dialog"
import { GuardianPickerDialog } from "../../_components/guardian-picker-dialog"
import { MedicalCertFormDialog } from "./medical-cert-form-dialog"

// Ancora della sezione tessera, nella pagina: la tessera arriva dall'ente,
// non si crea da qui, quindi il passo porta a guardarla e non a un form
export const CARD_SECTION_ID = "tessera"

type Props = {
  steps: SetupStep[]
  athlete: EditableAthlete
  linkedParents: number
  // Dati che i dialog già esistenti si aspettano, caricati dalla pagina
  course: {
    activeCourses: ActiveCourse[]
    currentAcademicYear: EnrollmentAcademicYear | null
    hasAssociationFee: boolean
    enrolledCourseIds: string[]
  }
}

const ICONS: Record<SetupStepId, React.ComponentType<{ className?: string }>> = {
  guardian: UserPlus,
  email: Mail,
  course: BookOpen,
  certificate: Stethoscope,
  card: IdCard,
}

const ACTION_LABELS: Record<SetupStepId, string> = {
  guardian: "Collega",
  email: "Aggiungi",
  course: "Iscrivi",
  certificate: "Carica",
  card: "Vedi tessera",
}

// ─────────────────────────────────────────────────────────────────────────
// "Da completare": in cima alla scheda, un passo per riga con il tasto che
// apre il dialog che esiste già. Nessun percorso nuovo da imparare.
//
// Un passo completato sparisce al refresh della pagina (ogni azione fa
// revalidatePath della scheda). Se non resta niente, il blocco non si mostra.
// ─────────────────────────────────────────────────────────────────────────
export function SetupChecklistCard({
  steps,
  athlete,
  linkedParents,
  course,
}: Props) {
  const [open, setOpen] = React.useState<SetupStepId | null>(null)

  if (steps.length === 0) return null

  function trigger(step: SetupStep) {
    const label = ACTION_LABELS[step.id]

    // Genitore e corso aprono il loro dialog dal proprio trigger: hanno già
    // la prop, e passare dallo stato qui vorrebbe dire duplicarne la logica
    if (step.id === "guardian") {
      return (
        <GuardianPickerDialog
          athleteId={athlete.id}
          existingGuardians={[]}
          trigger={
            <Button size="sm" className="min-h-11 shrink-0">
              {label}
            </Button>
          }
        />
      )
    }
    if (step.id === "course") {
      return (
        <EnrollCourseDialog
          athleteId={athlete.id}
          activeCourses={course.activeCourses}
          currentAcademicYear={course.currentAcademicYear}
          hasAssociationFee={course.hasAssociationFee}
          enrolledCourseIds={course.enrolledCourseIds}
          trigger={
            <Button size="sm" className="min-h-11 shrink-0">
              {label}
            </Button>
          }
        />
      )
    }
    if (step.id === "card") {
      return (
        <Button asChild size="sm" variant="outline" className="min-h-11 shrink-0">
          <a href={`#${CARD_SECTION_ID}`}>{label}</a>
        </Button>
      )
    }
    // Email e certificato: dialog controllati, lo stato sta qui
    return (
      <Button
        size="sm"
        className="min-h-11 shrink-0"
        onClick={() => setOpen(step.id)}
      >
        {label}
      </Button>
    )
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle>Da completare</CardTitle>
          <CardDescription>
            {steps.length === 1
              ? "Manca un passo perché la scheda sia a posto."
              : `Mancano ${steps.length} passi perché la scheda sia a posto.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {steps.map((step) => {
              const Icon = ICONS[step.id]
              return (
                <li
                  key={step.id}
                  className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.reason}
                    </p>
                  </div>
                  {trigger(step)}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <AthleteEditDialog
        open={open === "email"}
        onOpenChange={(next) => setOpen(next ? "email" : null)}
        athlete={athlete}
        linkedParents={linkedParents}
      />

      <MedicalCertFormDialog
        open={open === "certificate"}
        onOpenChange={(next) => setOpen(next ? "certificate" : null)}
        mode="create"
        athleteId={athlete.id}
      />
    </>
  )
}
