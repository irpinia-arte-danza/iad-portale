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
import { statusTone, TONE_SURFACE, TONE_TEXT } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

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
  // Nella colonna della panoramica il blocco sta stretto: una riga sola per
  // passo, con la conseguenza in poche parole
  compact?: boolean
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
// Il certificato per primo: è l'unico passo che impedisce di fare lezione
const STEP_ORDER: SetupStepId[] = [
  "certificate",
  "guardian",
  "email",
  "course",
  "card",
]

export function SetupChecklistCard({
  steps,
  compact = false,
  athlete,
  linkedParents,
  course,
}: Props) {
  const [open, setOpen] = React.useState<SetupStepId | null>(null)

  if (steps.length === 0) return null

  const ordered = [...steps].sort(
    (a, b) => STEP_ORDER.indexOf(a.id) - STEP_ORDER.indexOf(b.id),
  )

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
      {/* La card è ambra: sono dati da completare. I passi che bloccano
          (certificato, tessera, genitore) si colorano di rosso riga per riga */}
      <Card className="border-status-fix-border bg-status-fix-bg">
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
            {ordered.map((step) => {
              const Icon = ICONS[step.id]
              const tone = statusTone({ kind: "setupStep", step: step.id })
              const blocca = tone === "block"
              return (
                <li
                  key={step.id}
                  className={cn(
                    // Il tasto resta a destra anche sul telefono: la riga non
                    // va mai a capo sopra di lui
                    "flex items-center gap-2 rounded-md border bg-background p-3",
                    blocca && TONE_SURFACE[tone],
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground",
                      blocca && TONE_TEXT[tone],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        blocca && TONE_TEXT[tone],
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {compact ? step.short : step.reason}
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
