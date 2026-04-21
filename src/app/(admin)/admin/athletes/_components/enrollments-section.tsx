import { BookOpen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

import type { AthleteEnrollment } from "../queries"
import { EnrollCourseDialog } from "./enroll-course-dialog"
import { EnrollmentRowActions } from "./enrollment-row-actions"

type ActiveCourse = {
  id: string
  name: string
  type: keyof typeof COURSE_TYPE_LABELS
  monthlyFeeCents: number
}

interface EnrollmentsSectionProps {
  athleteId: string
  athleteFirstName: string
  enrollments: AthleteEnrollment[]
  activeCourses: ActiveCourse[]
  currentAcademicYearLabel: string | null
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function truncate(value: string, max = 80): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

export function EnrollmentsSection({
  athleteId,
  athleteFirstName,
  enrollments,
  activeCourses,
  currentAcademicYearLabel,
}: EnrollmentsSectionProps) {
  const activeCourseIdsForYear = enrollments
    .filter(
      (e) =>
        e.withdrawalDate === null &&
        e.academicYear.isCurrent === true,
    )
    .map((e) => e.courseId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Iscrizioni ai corsi</CardTitle>
            <CardDescription>
              Storico e iscrizioni attive per anno accademico.
            </CardDescription>
          </div>
          <EnrollCourseDialog
            athleteId={athleteId}
            activeCourses={activeCourses}
            currentAcademicYearLabel={currentAcademicYearLabel}
            enrolledCourseIds={activeCourseIdsForYear}
          />
        </div>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-medium">
              Nessuna iscrizione registrata
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Iscrivi l&apos;allieva a un corso attivo per tracciare frequenza e
              pagamenti.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {enrollments.map((e) => {
              const isWithdrawn = e.withdrawalDate !== null
              return (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-4 rounded-md border p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{e.course.name}</span>
                      <Badge variant="secondary">
                        {COURSE_TYPE_LABELS[e.course.type]}
                      </Badge>
                      {isWithdrawn ? (
                        <Badge variant="outline">Ritirata</Badge>
                      ) : (
                        <Badge>Attiva</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>A.A. {e.academicYear.label}</span>
                      <span>Iscritta il {formatDate(e.enrollmentDate)}</span>
                      {isWithdrawn && e.withdrawalDate && (
                        <span>Ritirata il {formatDate(e.withdrawalDate)}</span>
                      )}
                    </div>
                    {e.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        📝 {truncate(e.notes)}
                      </p>
                    )}
                  </div>
                  <EnrollmentRowActions
                    enrollment={{
                      id: e.id,
                      notes: e.notes,
                      withdrawalDate: e.withdrawalDate,
                      courseName: e.course.name,
                      athleteFirstName,
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
