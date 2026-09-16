import { CalendarDays } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { associationFeeDescription } from "@/lib/fees/association-fee-label"
import {
  computeScheduleDisplayStatus,
  type ScheduleDisplayStatus,
} from "@/lib/utils/schedule-status"

import type {
  AthleteAssociationSchedule,
  AthleteEnrollment,
  AthletePaymentSchedule,
} from "../queries"
import type {
  AthleteWithFormRelations,
  OpenScheduleOption,
} from "../../payments/queries"
import { ScheduleRowActions } from "./schedule-row-actions"
import { ScheduleSettleProvider } from "./schedule-settle-provider"

type FlattenedSchedule = AthletePaymentSchedule & {
  courseName: string
  // null per la quota associativa, che non è legata a un corso
  enrollmentId: string | null
}

interface SchedulesSectionProps {
  athleteId: string
  athleteFirstName: string
  athleteLastName: string
  enrollments: AthleteEnrollment[]
  associationSchedules: AthleteAssociationSchedule[]
  athletesForPaymentForm: AthleteWithFormRelations[]
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function flatten(
  enrollments: AthleteEnrollment[],
  associationSchedules: AthleteAssociationSchedule[],
): FlattenedSchedule[] {
  const association = associationSchedules.map((s) => ({
    ...s,
    courseName: associationFeeDescription(s.academicYear.label),
    enrollmentId: null,
  }))
  const monthly = enrollments.flatMap((e) =>
    e.paymentSchedules.map((s) => ({
      ...s,
      courseName: e.course.name,
      enrollmentId: e.id,
    })),
  )
  return [...association, ...monthly]
}

export function SchedulesSection({
  athleteId,
  athleteFirstName,
  athleteLastName,
  enrollments,
  associationSchedules,
  athletesForPaymentForm,
  openSchedulesByAthlete,
}: SchedulesSectionProps) {
  const all = flatten(enrollments, associationSchedules)

  const overdue = all
    .filter((s) => computeScheduleDisplayStatus(s) === "OVERDUE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const due = all
    .filter((s) => computeScheduleDisplayStatus(s) === "DUE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const future = all
    .filter((s) => computeScheduleDisplayStatus(s) === "FUTURE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const paid = all
    .filter((s) => s.status === "PAID")
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())

  const waived = all
    .filter((s) => s.status === "WAIVED")
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())

  const groups: {
    key: string
    label: string
    items: FlattenedSchedule[]
  }[] = [
    { key: "OVERDUE", label: "In ritardo", items: overdue },
    { key: "DUE", label: "In scadenza", items: due },
    { key: "FUTURE", label: "Prossime", items: future },
    { key: "PAID", label: "Pagate", items: paid },
    { key: "WAIVED", label: "Non dovute", items: waived },
  ]

  // Il dialog "Salda" sta nel provider, fuori dai gruppi: una scadenza appena
  // pagata cambia gruppo e la sua riga viene rimontata altrove.
  return (
    <ScheduleSettleProvider
      athleteId={athleteId}
      athleteFirstName={athleteFirstName}
      athleteLastName={athleteLastName}
      athletesForPaymentForm={athletesForPaymentForm}
      openSchedulesByAthlete={openSchedulesByAthlete}
    >
      <Card>
        <CardHeader>
          <CardTitle>Scadenze</CardTitle>
          <CardDescription>
            Contributo di iscrizione annuale e contributi mensili, generati automaticamente
            all&apos;iscrizione ai corsi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium">Nessuna scadenza</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Le scadenze vengono generate automaticamente quando iscrivi
                l&apos;allieva a un corso.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="destructive">{overdue.length} In ritardo</Badge>
                <Badge variant="outline">{due.length} In scadenza</Badge>
                <Badge variant="outline">{future.length} Prossime</Badge>
                <Badge variant="secondary">{paid.length} Pagate</Badge>
                <Badge variant="outline">{waived.length} Non dovute</Badge>
              </div>

              <div className="space-y-6">
                {groups
                  .filter((g) => g.items.length > 0)
                  .map((group) => (
                    <section key={group.key} className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        {group.label}
                      </h4>
                      <ul className="space-y-2">
                        {group.items.map((s) => (
                          <ScheduleRow key={s.id} schedule={s} />
                        ))}
                      </ul>
                    </section>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </ScheduleSettleProvider>
  )
}

function ScheduleRow({ schedule }: { schedule: FlattenedSchedule }) {
  const displayStatus = computeScheduleDisplayStatus(schedule)

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <span className="font-medium">{formatDate(schedule.dueDate)}</span>
        <span className="text-sm text-muted-foreground">
          {schedule.courseName}
        </span>
        <span className="font-mono text-sm">
          {formatEur(schedule.amountCents)}
        </span>
        <StatusBadge status={displayStatus} />
      </div>
      <ScheduleRowActions
        schedule={{
          id: schedule.id,
          status: schedule.status,
          displayStatus,
          feeType: schedule.feeType,
          courseEnrollmentId: schedule.enrollmentId,
          courseName: schedule.courseName,
          dueDate: schedule.dueDate,
          amountCents: schedule.amountCents,
          waiverReason: schedule.waiverReason,
          paymentId: schedule.paymentId,
        }}
      />
    </li>
  )
}

function StatusBadge({ status }: { status: ScheduleDisplayStatus }) {
  if (status === "OVERDUE") {
    return <Badge variant="destructive">In ritardo</Badge>
  }
  if (status === "DUE") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      >
        In scadenza
      </Badge>
    )
  }
  if (status === "FUTURE") {
    return <Badge variant="outline">Prossima</Badge>
  }
  if (status === "PAID") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
      >
        Pagata
      </Badge>
    )
  }
  return <Badge variant="secondary">Non dovuta</Badge>
}
