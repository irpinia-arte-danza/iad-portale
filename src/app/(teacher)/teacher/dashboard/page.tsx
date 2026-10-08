import Link from "next/link"
import { CalendarOff, ChevronRight, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { requireTeacher } from "@/lib/auth/require-teacher"
import { formatDateShort, formatDayLongRome } from "@/lib/utils/format"

import {
  getMyCourses,
  getRecentAttendanceStats,
  getTeacherProfile,
  getTodayLessons,
  getTodaySchedules,
  getUpcomingLessons,
  type TodayLesson,
  type TodaySchedule,
} from "../_actions/queries"

// ─────────────────────────────────────────────────────────────────────────
// La home dell'insegnante, pensata per il telefono in sala: in cima i corsi
// di oggi, ognuno con un solo tasto grande, «Segna le presenze». Il resto
// (prossime lezioni, classi, presenze del mese) sta sotto, in una colonna.
// ─────────────────────────────────────────────────────────────────────────

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

type TodayItem = {
  scheduleId: string
  courseName: string
  startTime: string
  endTime: string
  location: string | null
  lesson: { id: string; status: TodayLesson["status"]; attendances: number } | null
}

// Gli orari di oggi, con la lezione già aperta se c'è. Un orario senza
// lezione si apre dal tasto (pagina ponte /teacher/sessions/new).
function todayItems(lessons: TodayLesson[], schedules: TodaySchedule[]): TodayItem[] {
  const lessonBySchedule = new Map(lessons.map((l) => [l.schedule.id, l]))
  const items: TodayItem[] = schedules.map((s) => {
    const lesson = lessonBySchedule.get(s.id)
    return {
      scheduleId: s.id,
      courseName: s.course.name,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      lesson: lesson
        ? { id: lesson.id, status: lesson.status, attendances: lesson._count.attendances }
        : null,
    }
  })
  // Lezioni di oggi il cui orario non cade oggi (aperte dall'admin, orario
  // cambiato): si mostrano comunque, non devono sparire
  for (const l of lessons) {
    if (!items.some((i) => i.scheduleId === l.schedule.id)) {
      items.push({
        scheduleId: l.schedule.id,
        courseName: l.schedule.course.name,
        startTime: l.startTime,
        endTime: l.endTime,
        location: l.schedule.location,
        lesson: { id: l.id, status: l.status, attendances: l._count.attendances },
      })
    }
  }
  return items.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

type PageProps = { searchParams: Promise<{ error?: string }> }

export default async function TeacherDashboardPage({ searchParams }: PageProps) {
  const { teacherId } = await requireTeacher()
  const { error } = await searchParams

  const [profile, courses, todayLessons, todaySchedules, upcoming, stats] =
    await Promise.all([
      getTeacherProfile(teacherId),
      getMyCourses(teacherId),
      getTodayLessons(teacherId),
      getTodaySchedules(teacherId),
      getUpcomingLessons(teacherId, 3),
      getRecentAttendanceStats(teacherId),
    ])

  const today = todayItems(todayLessons, todaySchedules)
  const presentRatio =
    stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Buongiorno {profile?.firstName ?? "Insegnante"}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDayLongRome(new Date())}</p>
      </header>

      {/* Il valore arriva dall'indirizzo: non si mostra, si dice solo che
          l'apertura non è riuscita */}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Non è stato possibile aprire la lezione di oggi. Riprova dal tasto qui sotto; se
          succede ancora, avvisa la segreteria.
        </p>
      ) : null}

      {/* Oggi: una card per corso, un tasto solo */}
      <section className="space-y-2" aria-labelledby="oggi">
        <h2 id="oggi" className="text-lg font-semibold">
          Oggi
        </h2>
        {today.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={CalendarOff}
                title="Nessuna lezione oggi"
                description="Nei giorni di lezione qui compare il corso con il tasto per segnare le presenze."
                action={
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href="/teacher/courses">Le mie classi</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {today.map((item) => (
              <li key={item.scheduleId}>
                <Card>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{item.courseName}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {item.startTime}–{item.endTime}
                          </span>
                          {item.location ? ` · ${item.location}` : null}
                        </p>
                      </div>
                      {item.lesson?.status === "CANCELLED" ? (
                        <Badge variant="outline">Annullata</Badge>
                      ) : item.lesson && item.lesson.attendances > 0 ? (
                        <Badge variant="secondary">
                          {item.lesson.attendances}{" "}
                          {item.lesson.attendances === 1 ? "segnata" : "segnate"}
                        </Badge>
                      ) : null}
                    </div>
                    {item.lesson?.status === "CANCELLED" ? (
                      <p className="text-sm text-muted-foreground">
                        Lezione annullata: niente presenze da segnare.
                      </p>
                    ) : item.lesson ? (
                      <Button
                        asChild
                        className="min-h-11 w-full"
                        variant={item.lesson.status === "COMPLETED" ? "outline" : "default"}
                      >
                        <Link href={`/teacher/sessions/${item.lesson.id}`}>
                          {item.lesson.status === "COMPLETED"
                            ? "Rivedi le presenze"
                            : "Segna le presenze"}
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="min-h-11 w-full">
                        <Link href={`/teacher/sessions/new?scheduleId=${item.scheduleId}`}>
                          Segna le presenze
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-2" aria-labelledby="prossime">
          <h2 id="prossime" className="text-lg font-semibold">
            Prossime lezioni
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {upcoming.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.schedule.course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(l.date)} ·{" "}
                        <span className="font-mono tabular-nums">
                          {l.startTime}–{l.endTime}
                        </span>
                        {l.schedule.location ? ` · ${l.schedule.location}` : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-2" aria-labelledby="classi">
        <h2 id="classi" className="text-lg font-semibold">
          Le mie classi
        </h2>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Users}
                title="Nessuna classe assegnata"
                description="Quando la segreteria ti assegna un corso, compare qui con orari e allieve."
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/teacher/courses/${c.id}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition hover:shadow-md">
                    <CardContent className="flex min-h-11 items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold">{c.name}</p>
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
                          <Users className="h-3 w-3" aria-hidden />
                          {c.activeEnrollments} {c.activeEnrollments === 1 ? "allieva" : "allieve"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Presenze del mese: un numero, non tre riquadri colorati — presente e
          assente non sono stati che bloccano (§17.43) */}
      {stats.total > 0 ? (
        <section className="space-y-2" aria-labelledby="presenze">
          <h2 id="presenze" className="text-lg font-semibold">
            Presenze ultimi 30 giorni
          </h2>
          <Card>
            <CardContent className="py-4 text-sm">
              <p>
                <strong className="tabular-nums">{stats.present}</strong>{" "}
                {stats.present === 1 ? "presente" : "presenti"} ·{" "}
                <strong className="tabular-nums">{stats.absent}</strong>{" "}
                {stats.absent === 1 ? "assente" : "assenti"} ·{" "}
                <strong className="tabular-nums">{stats.justified}</strong>{" "}
                {stats.justified === 1 ? "giustificata" : "giustificate"}
              </p>
              {presentRatio !== null ? (
                <p className="mt-1 text-muted-foreground">
                  Presenza {presentRatio}% su {stats.total}{" "}
                  {stats.total === 1 ? "marcatura" : "marcature"} nei tuoi corsi
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
