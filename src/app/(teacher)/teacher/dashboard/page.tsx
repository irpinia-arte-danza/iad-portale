import Link from "next/link"
import { CalendarClock, ChevronRight, Clock, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireTeacher } from "@/lib/auth/require-teacher"
import { formatDateShort, formatMeseIt } from "@/lib/utils/format"

import {
  getMyCourses,
  getRecentAttendanceStats,
  getTeacherProfile,
  getTodayLessons,
  getTodaySchedules,
  getUpcomingLessons,
} from "../_actions/queries"

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

function todayLongLabel(): string {
  const d = new Date()
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d)
}

export default async function TeacherDashboardPage() {
  const { teacherId } = await requireTeacher()

  const [profile, courses, todayLessons, todaySchedules, upcoming, stats] =
    await Promise.all([
      getTeacherProfile(teacherId),
      getMyCourses(teacherId),
      getTodayLessons(teacherId),
      getTodaySchedules(teacherId),
      getUpcomingLessons(teacherId, 3),
      getRecentAttendanceStats(teacherId),
    ])

  // Lezioni di oggi: unisco Lesson già create + CourseSchedule del giorno
  // per cui Lesson NON esiste ancora (devono essere aperte dall'insegnante)
  const lessonsByCourseId = new Map(
    todayLessons.map((l) => [l.schedule.course.id, l]),
  )
  const todayItems = [
    ...todayLessons.map((l) => ({
      kind: "lesson" as const,
      courseId: l.schedule.course.id,
      courseName: l.schedule.course.name,
      startTime: l.startTime,
      endTime: l.endTime,
      location: l.schedule.location,
      lessonId: l.id,
      attendancesCount: l._count.attendances,
      status: l.status,
    })),
    ...todaySchedules
      .filter((s) => !lessonsByCourseId.has(s.course.id))
      .map((s) => ({
        kind: "schedule" as const,
        courseId: s.course.id,
        courseName: s.course.name,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        scheduleId: s.id,
      })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))

  const presentRatio =
    stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header welcome */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Buongiorno {profile?.firstName ?? "Insegnante"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {todayLongLabel()}
        </p>
      </header>

      {/* Lezione di oggi */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Lezione di oggi</h2>
        {todayItems.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Oggi non hai lezioni in programma.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayItems.map((item) => (
              <Card key={`${item.kind}-${item.courseId}-${item.startTime}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {item.courseName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {item.startTime}–{item.endTime}
                      </span>
                      {item.location ? ` · ${item.location}` : null}
                    </p>
                  </div>
                  {item.kind === "lesson" ? (
                    <div className="flex flex-col items-end gap-1">
                      {item.status === "CANCELLED" ? (
                        <Badge variant="destructive">Annullata</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {item.attendancesCount} registrate
                        </Badge>
                      )}
                      <Button asChild size="sm" className="min-h-11">
                        <Link href={`/teacher/sessions/${item.lessonId}`}>
                          Continua
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <form
                      action={`/api/teacher/open-lesson`}
                      method="POST"
                      className="contents"
                    >
                      {/* L'apertura lezione è una server action: usiamo
                          un Link che porta alla pagina sessione, la quale
                          fa upsert Lesson on-demand se non esiste. */}
                      <Button asChild size="sm" className="min-h-11">
                        <Link
                          href={`/teacher/sessions/new?scheduleId=${item.scheduleId}`}
                        >
                          Apri registrazione
                        </Link>
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Prossime lezioni */}
      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Prossime lezioni</h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {upcoming.map((l) => (
              <Card key={l.id}>
                <CardContent className="space-y-1 py-3 text-sm">
                  <p className="font-medium">{l.schedule.course.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(l.date)} ·{" "}
                    <span className="font-mono tabular-nums">
                      {l.startTime}–{l.endTime}
                    </span>
                  </p>
                  {l.schedule.location ? (
                    <p className="text-xs text-muted-foreground">
                      {l.schedule.location}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Le mie classi */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Le mie classi</h2>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Non sei ancora assegnata a nessun corso.
              <br />
              Contatta la segreteria.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/courses/${c.id}`}
                className="block"
              >
                <Card className="transition hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold">
                          {c.name}
                        </p>
                        {c.isPrimary ? (
                          <Badge variant="secondary" className="text-xs">
                            Principale
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.schedules.length === 0
                          ? "Nessun orario impostato"
                          : c.schedules
                              .map(
                                (s) =>
                                  `${DAY_OF_WEEK_LABELS[s.dayOfWeek].slice(0, 3)} ${s.startTime}`,
                              )
                              .join(" · ")}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {c.activeEnrollments}{" "}
                        {c.activeEnrollments === 1 ? "allieva" : "allieve"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Storico presenze recente */}
      {stats.total > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Presenze ultimi 30 giorni</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {formatMeseIt(new Date())}
              </CardTitle>
              <CardDescription>
                Su {stats.total} marcature totali nei tuoi corsi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border bg-emerald-50 py-3 dark:bg-emerald-950/30">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.present}
                  </p>
                  <p className="text-xs text-emerald-900 dark:text-emerald-100">
                    Presenti
                  </p>
                </div>
                <div className="rounded-md border bg-red-50 py-3 dark:bg-red-950/30">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.absent}
                  </p>
                  <p className="text-xs text-red-900 dark:text-red-100">
                    Assenti
                  </p>
                </div>
                <div className="rounded-md border bg-amber-50 py-3 dark:bg-amber-950/30">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.justified}
                  </p>
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    Giustificate
                  </p>
                </div>
              </div>
              {presentRatio !== null ? (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Tasso di presenza: <strong>{presentRatio}%</strong>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
