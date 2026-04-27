import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"

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
import { formatDateLong } from "@/lib/utils/format"

import { AttendanceForm } from "./_components/attendance-form"

type PageProps = {
  params: Promise<{ id: string }>
}

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
      notes: true,
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
          id: true,
          athleteId: true,
          status: true,
          notes: true,
        },
      },
    },
  })

  if (!lesson) notFound()
  if (lesson.schedule.course.teacherCourses.length === 0) {
    // IDOR: lesson appartiene a corso non assegnato al teacher
    notFound()
  }

  // Allieve attive iscritte al corso, AY corrente
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      courseId: lesson.schedule.course.id,
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
          photoUrl: true,
        },
      },
    },
    orderBy: [
      { athlete: { lastName: "asc" } },
      { athlete: { firstName: "asc" } },
    ],
  })

  const existingByAthleteId = new Map(
    lesson.attendances.map((a) => [a.athleteId, a]),
  )

  const items = enrollments.map((e) => {
    const existing = existingByAthleteId.get(e.athlete.id)
    return {
      athleteId: e.athlete.id,
      firstName: e.athlete.firstName,
      lastName: e.athlete.lastName,
      photoUrl: e.athlete.photoUrl,
      currentStatus: existing?.status ?? null,
      currentNotes: existing?.notes ?? null,
    }
  })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="min-h-11 -ml-2">
          <Link href="/teacher/dashboard">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Indietro
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl">
                {lesson.schedule.course.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {formatDateLong(lesson.date)} ·{" "}
                <span className="font-mono tabular-nums">
                  {lesson.startTime}–{lesson.endTime}
                </span>
                {lesson.schedule.location ? ` · ${lesson.schedule.location}` : null}
              </CardDescription>
            </div>
            {lesson.status === "CANCELLED" ? (
              <Badge variant="destructive">Annullata</Badge>
            ) : lesson.status === "COMPLETED" ? (
              <Badge variant="secondary">Registrata</Badge>
            ) : (
              <Badge>In corso</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {lesson.status === "CANCELLED" ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Questa lezione è stata annullata. Non sono ammesse registrazioni.
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nessuna allieva iscritta al corso.
          </CardContent>
        </Card>
      ) : (
        <AttendanceForm
          lessonId={lesson.id}
          items={items}
          locked={lesson.status === "COMPLETED"}
        />
      )}
    </div>
  )
}
