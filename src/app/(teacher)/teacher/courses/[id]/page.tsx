import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ChevronLeft, Phone, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth/require-teacher"
import { formatDateShort } from "@/lib/utils/format"

type PageProps = {
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

const MEDICAL_WARN_DAYS = 30

function classifyCertificate(expiry: Date | null): "missing" | "expired" | "expiring" | "valid" {
  if (!expiry) return "missing"
  const now = new Date()
  const expiryDate = new Date(expiry)
  if (expiryDate < now) return "expired"
  const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays <= MEDICAL_WARN_DAYS) return "expiring"
  return "valid"
}

export default async function TeacherCourseDetailPage({ params }: PageProps) {
  const { teacherId } = await requireTeacher()
  const { id: courseId } = await params

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      type: true,
      schedules: {
        where: {
          OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
        },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          location: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      teacherCourses: {
        where: { teacherId },
        select: { id: true, isPrimary: true },
      },
    },
  })

  if (!course) notFound()
  if (course.teacherCourses.length === 0) notFound()

  // Allieve attive iscritte AY corrente con genitore primario + cert medico
  // più recente
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      courseId: course.id,
      withdrawalDate: null,
      academicYear: { isCurrent: true },
      athlete: { deletedAt: null },
    },
    select: {
      athlete: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          parentRelations: {
            where: {
              parent: { deletedAt: null },
            },
            orderBy: [
              { isPrimaryContact: "desc" },
              { isPrimaryPayer: "desc" },
            ],
            take: 1,
            select: {
              relationship: true,
              parent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          medicalCertificates: {
            orderBy: { expiryDate: "desc" },
            take: 1,
            select: { expiryDate: true },
          },
        },
      },
    },
    orderBy: [
      { athlete: { lastName: "asc" } },
      { athlete: { firstName: "asc" } },
    ],
  })

  // Stats presenze 30gg per ogni allieva
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 30)
  const athleteIds = enrollments.map((e) => e.athlete.id)
  const grouped =
    athleteIds.length > 0
      ? await prisma.attendance.groupBy({
          by: ["athleteId", "status"],
          where: {
            athleteId: { in: athleteIds },
            lesson: {
              date: { gte: since },
              schedule: { courseId: course.id },
            },
          },
          _count: { _all: true },
        })
      : []

  const statsByAthlete = new Map<
    string,
    { present: number; absent: number; justified: number; total: number }
  >()
  for (const g of grouped) {
    const cur = statsByAthlete.get(g.athleteId) ?? {
      present: 0,
      absent: 0,
      justified: 0,
      total: 0,
    }
    if (g.status === "PRESENT") cur.present += g._count._all
    else if (g.status === "ABSENT") cur.absent += g._count._all
    else if (g.status === "JUSTIFIED") cur.justified += g._count._all
    cur.total += g._count._all
    statsByAthlete.set(g.athleteId, cur)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 min-h-11">
        <Link href="/teacher/courses">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Le mie classi
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl">{course.name}</CardTitle>
              <CardDescription className="mt-1 space-y-1">
                <span className="block">
                  {course.schedules.length === 0
                    ? "Nessun orario impostato"
                    : course.schedules
                        .map(
                          (s) =>
                            `${DAY_OF_WEEK_LABELS[s.dayOfWeek]} ${s.startTime}–${s.endTime}${s.location ? ` · ${s.location}` : ""}`,
                        )
                        .join(" · ")}
                </span>
              </CardDescription>
            </div>
            {course.teacherCourses[0]?.isPrimary ? (
              <Badge variant="secondary">Principale</Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <h2 className="text-lg font-semibold">
        Allieve ({enrollments.length})
      </h2>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nessuna allieva iscritta al corso.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {enrollments.map((e) => {
                const a = e.athlete
                const parentRel = a.parentRelations[0]
                const cert = a.medicalCertificates[0]?.expiryDate ?? null
                const certStatus = classifyCertificate(cert)
                const stats = statsByAthlete.get(a.id) ?? {
                  present: 0,
                  absent: 0,
                  justified: 0,
                  total: 0,
                }
                const presentRatio =
                  stats.total > 0
                    ? Math.round((stats.present / stats.total) * 100)
                    : null

                return (
                  <li key={a.id} className="flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                        {a.firstName.charAt(0)}
                        {a.lastName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {a.firstName} {a.lastName}
                        </p>
                        {a.dateOfBirth ? (
                          <p className="text-xs text-muted-foreground">
                            Nata il {formatDateShort(a.dateOfBirth)}
                          </p>
                        ) : null}
                      </div>
                      {certStatus === "missing" ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Cert. mancante
                        </Badge>
                      ) : certStatus === "expired" ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Scaduto
                        </Badge>
                      ) : certStatus === "expiring" ? (
                        <Badge className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                          <AlertTriangle className="h-3 w-3" />
                          In scadenza
                        </Badge>
                      ) : null}
                    </div>

                    {parentRel ? (
                      <div className="flex items-center gap-2 pl-13 text-xs text-muted-foreground sm:pl-13">
                        <span>
                          Genitore:{" "}
                          <strong className="text-foreground">
                            {parentRel.parent.firstName}{" "}
                            {parentRel.parent.lastName}
                          </strong>
                        </span>
                        {parentRel.parent.phone ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="ml-auto h-9 min-h-9 gap-1"
                          >
                            <a href={`tel:${parentRel.parent.phone}`}>
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">
                                {parentRel.parent.phone}
                              </span>
                            </a>
                          </Button>
                        ) : (
                          <span className="ml-auto text-xs">— no telefono</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nessun genitore collegato.
                      </p>
                    )}

                    {stats.total > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Ultimi 30gg:{" "}
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {stats.present}P
                        </span>{" "}
                        ·{" "}
                        <span className="text-red-700 dark:text-red-400">
                          {stats.absent}A
                        </span>{" "}
                        ·{" "}
                        <span className="text-amber-700 dark:text-amber-400">
                          {stats.justified}G
                        </span>
                        {presentRatio !== null
                          ? ` · ${presentRatio}% presenza`
                          : null}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
