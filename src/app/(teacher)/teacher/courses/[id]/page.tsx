import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ShieldAlert } from "lucide-react"

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
import { classifyCert, type CertStatus } from "@/lib/medical-certificates/certificate-status"
import { statusTone, TONE_BADGE, TONE_TEXT } from "@/lib/status/tone"
import { formatDateShort } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import { getCourseRoster } from "../../_actions/queries"

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

// Il certificato è l'unica cosa che blocca la lezione, e il colore lo
// decide statusTone (§17.43): rosso se manca o è scaduto, ambra in scadenza
const CERT_LABEL: Record<Exclude<CertStatus, "valid">, string> = {
  missing: "Senza certificato",
  expired: "Certificato scaduto",
  expiring: "Certificato in scadenza",
}

export default async function TeacherCourseDetailPage({ params }: PageProps) {
  const { teacherId } = await requireTeacher()
  const { id: courseId } = await params

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
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

  // Allieve attive iscritte all'anno corrente, con la scadenza del
  // certificato. Dei genitori qui non arriva niente (vedi getCourseRoster).
  const enrollments = await getCourseRoster(course.id)

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
                const cert = a.medicalCertificates[0]?.expiryDate ?? null
                const certStatus = classifyCert(cert)
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

                const tone = statusTone({ kind: "certificate", status: certStatus })

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
                      {certStatus !== "valid" ? (
                        <Badge variant="outline" className={cn("gap-1", TONE_BADGE[tone])}>
                          <ShieldAlert className="h-3 w-3" aria-hidden />
                          {CERT_LABEL[certStatus]}
                        </Badge>
                      ) : null}
                    </div>

                    {tone === "block" ? (
                      <p className={cn("text-xs", TONE_TEXT[tone])}>
                        Senza certificato valido non può fare lezione.
                      </p>
                    ) : null}

                    {stats.total > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Ultimi 30 giorni: {stats.present}{" "}
                        {stats.present === 1 ? "presente" : "presenti"} · {stats.absent}{" "}
                        {stats.absent === 1 ? "assente" : "assenti"} · {stats.justified}{" "}
                        {stats.justified === 1 ? "giustificata" : "giustificate"}
                        {presentRatio !== null ? ` · ${presentRatio}% presenza` : null}
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
