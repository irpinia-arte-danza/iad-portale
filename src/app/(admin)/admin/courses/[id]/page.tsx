import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, UserX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { CourseDetailHeader } from "../_components/course-detail-header"
import { CourseInfoDisplay } from "../_components/course-info-display"
import { getCourseById, listActiveTeachers } from "../queries"

interface PageProps {
  params: Promise<{ id: string }>
}

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

const ATHLETE_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export default async function CourseDetailPage({ params }: PageProps) {
  const resolvedParams = await params

  const [course, currentAcademicYear, teachers] = await Promise.all([
    getCourseById(resolvedParams.id),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    }),
    listActiveTeachers(),
  ])

  if (!course) {
    notFound()
  }

  const activeEnrollments = course.enrollments.filter(
    (e) => e.withdrawalDate === null,
  )
  const withdrawnEnrollments = course.enrollments.filter(
    (e) => e.withdrawalDate !== null,
  )

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Corsi", href: "/admin/courses" },
          { label: course.name },
        ]}
        title={course.name}
        action={<CourseDetailHeader course={course} teachers={teachers} />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <CourseInfoDisplay
            course={course}
            currentAcademicYearLabel={currentAcademicYear?.label ?? null}
          />

          <Card>
            <CardHeader>
              <CardTitle>Orari</CardTitle>
              <CardDescription>
                {course.schedules.length === 0
                  ? "Nessun orario configurato"
                  : `${course.schedules.length} ${
                      course.schedules.length === 1 ? "slot" : "slot"
                    } settimanali`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course.schedules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessun orario configurato per questo corso.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {course.schedules.map((schedule) => (
                    <li
                      key={schedule.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek] ?? "—"}
                          </span>
                          <span className="font-mono text-sm">
                            {schedule.startTime}–{schedule.endTime}
                          </span>
                        </div>
                        {schedule.location && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {schedule.location}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Iscritte</CardTitle>
              <CardDescription>
                {course.enrollments.length === 0
                  ? "Nessuna iscrizione registrata"
                  : `${activeEnrollments.length} attive · ${withdrawnEnrollments.length} ritirate`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course.enrollments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <UserX className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessuna allieva iscritta a questo corso.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {course.enrollments.map((enrollment) => {
                    const isWithdrawn = enrollment.withdrawalDate !== null
                    return (
                      <li key={enrollment.id}>
                        <Link
                          href={`/admin/athletes/${enrollment.athlete.id}`}
                          className={`flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50 ${
                            isWithdrawn ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {enrollment.athlete.lastName}{" "}
                                {enrollment.athlete.firstName}
                              </span>
                              <Badge variant="secondary" className="font-mono text-xs">
                                AA {enrollment.academicYear.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {ATHLETE_STATUS_LABELS[
                                  enrollment.athlete.status
                                ] ?? enrollment.athlete.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Iscritta il{" "}
                              {dateFormatter.format(enrollment.enrollmentDate)}
                              {enrollment.withdrawalDate && (
                                <>
                                  {" · Ritirata il "}
                                  {dateFormatter.format(
                                    enrollment.withdrawalDate,
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                          {isWithdrawn ? (
                            <Badge variant="outline">Ritirata</Badge>
                          ) : (
                            <Badge>Attiva</Badge>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </ResourceContent>
    </>
  )
}
