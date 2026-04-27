import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { requireTeacher } from "@/lib/auth/require-teacher"

import { getMyCourses } from "../_actions/queries"

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

export default async function TeacherCoursesPage() {
  const { teacherId } = await requireTeacher()
  const courses = await getMyCourses(teacherId)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Le mie classi</h1>
        <p className="text-sm text-muted-foreground">
          Tocca un corso per vedere allieve e contatti.
        </p>
      </header>

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
            <Link key={c.id} href={`/teacher/courses/${c.id}`} className="block">
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
    </div>
  )
}
