import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ATTENDANCE_EDIT_DAYS, attendanceEditCutoff } from "@/lib/attendance/edit-window"
import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth/require-teacher"
import { formatDateLong } from "@/lib/utils/format"

import { AttendanceForm } from "./_components/attendance-form"

type PageProps = {
  params: Promise<{ id: string }>
}

// La pagina delle presenze di una lezione: elenco delle allieve con una
// casella ciascuna e un solo tasto Salva. Dopo ATTENDANCE_EDIT_DAYS giorni
// la lezione è chiusa (#53): si vede ancora chi c'era, non si cambia più.
export default async function SessionPage({ params }: PageProps) {
  const { teacherId } = await requireTeacher()
  const { id } = await params

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      schedule: {
        select: {
          location: true,
          course: {
            select: {
              id: true,
              name: true,
              teacherCourses: {
                where: { teacherId },
                select: { id: true },
              },
            },
          },
        },
      },
      attendances: {
        select: {
          athleteId: true,
          status: true,
          notes: true,
        },
      },
    },
  })

  if (!lesson) notFound()
  // La lezione è di un corso non assegnato all'insegnante: come se non esistesse
  if (lesson.schedule.course.teacherCourses.length === 0) notFound()

  // Le allieve iscritte al corso nell'anno corrente. Solo il nome: niente
  // genitori, niente recapiti (#49)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      courseId: lesson.schedule.course.id,
      withdrawalDate: null,
      deletedAt: null,
      academicYear: { isCurrent: true },
      athlete: { deletedAt: null },
    },
    select: {
      athlete: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ athlete: { lastName: "asc" } }, { athlete: { firstName: "asc" } }],
  })

  const existingByAthleteId = new Map(lesson.attendances.map((a) => [a.athleteId, a]))
  const items = enrollments.map((e) => {
    const existing = existingByAthleteId.get(e.athlete.id)
    return {
      athleteId: e.athlete.id,
      firstName: e.athlete.firstName,
      lastName: e.athlete.lastName,
      currentStatus: existing?.status ?? null,
      currentNotes: existing?.notes ?? null,
    }
  })

  const closed = lesson.date < attendanceEditCutoff(new Date())
  const cancelled = lesson.status === "CANCELLED"
  const locked = closed || cancelled

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 min-h-11">
        <Link href="/teacher/dashboard">
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          Indietro
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl">{lesson.schedule.course.name}</CardTitle>
              <CardDescription className="mt-1">
                {formatDateLong(lesson.date)} ·{" "}
                <span className="font-mono tabular-nums">
                  {lesson.startTime}–{lesson.endTime}
                </span>
                {lesson.schedule.location ? ` · ${lesson.schedule.location}` : null}
              </CardDescription>
            </div>
            {cancelled ? (
              <Badge variant="outline">Annullata</Badge>
            ) : lesson.status === "COMPLETED" ? (
              <Badge variant="secondary">Segnate</Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {closed && !cancelled ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p>
              <strong>Lezione chiusa:</strong> le presenze si segnano entro {ATTENDANCE_EDIT_DAYS}{" "}
              giorni dalla lezione. Qui vedi quelle registrate; per correggerle avvisa la
              segreteria.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {cancelled ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Questa lezione è stata annullata: niente presenze da segnare.
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nessuna allieva iscritta al corso quest&apos;anno.
          </CardContent>
        </Card>
      ) : (
        <AttendanceForm lessonId={lesson.id} items={items} locked={locked} />
      )}
    </div>
  )
}
