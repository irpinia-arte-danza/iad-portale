import Link from "next/link"
import { notFound } from "next/navigation"
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

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { TeacherAnagraficaDisplay } from "../_components/teacher-anagrafica-display"
import { TeacherDetailHeader } from "../_components/teacher-detail-header"
import { getTeacherById } from "../queries"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeacherDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const teacher = await getTeacherById(resolvedParams.id)

  if (!teacher) {
    notFound()
  }

  const fullName = `${teacher.lastName} ${teacher.firstName}`

  // Sprint 5: M2M via teacherCourses (con isPrimary). Lista deduplicata
  // unendo legacy teacher.courses (per backward compat su record che il
  // backfill non ha sincronizzato).
  const m2mCourses = teacher.teacherCourses.map((tc) => ({
    id: tc.course.id,
    name: tc.course.name,
    type: tc.course.type,
    isActive: tc.course.isActive,
    _count: tc.course._count,
    isPrimary: tc.isPrimary,
  }))
  const m2mIds = new Set(m2mCourses.map((c) => c.id))
  const legacyOnlyCourses = teacher.courses
    .filter((c) => !m2mIds.has(c.id))
    .map((c) => ({ ...c, isPrimary: false }))
  const courses = [...m2mCourses, ...legacyOnlyCourses]
  const activeCourses = courses.filter((c) => c.isActive)
  const archivedCourses = courses.filter((c) => !c.isActive)

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Insegnanti", href: "/admin/teachers" },
          { label: fullName },
        ]}
        title={fullName}
        action={<TeacherDetailHeader teacher={teacher} />}
      />
      <ResourceContent>
        <div className="grid gap-6 md:grid-cols-2">
          <TeacherAnagraficaDisplay teacher={teacher} />

          <Card>
            <CardHeader>
              <CardTitle>Corsi assegnati</CardTitle>
              <CardDescription>
                {courses.length === 0
                  ? "Nessun corso assegnato"
                  : `${activeCourses.length} attivi · ${archivedCourses.length} archiviati`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Questa insegnante non è ancora assegnata a nessun corso.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {courses.map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className={`flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50 ${
                          course.isActive ? "" : "opacity-60"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{course.name}</span>
                            <Badge variant="secondary">
                              {COURSE_TYPE_LABELS[course.type]}
                            </Badge>
                            {course.isPrimary ? (
                              <Badge variant="outline" className="text-xs">
                                Principale
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {course._count.enrollments}{" "}
                            {course._count.enrollments === 1
                              ? "iscrizione"
                              : "iscrizioni"}
                          </p>
                        </div>
                        {course.isActive ? (
                          <Badge>Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Archiviato</Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compensi</CardTitle>
            <CardDescription>
              Disponibile dopo Sprint 4 (Finanze + compensi sportivi)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In questa sezione troverai storico compensi, totale anno corrente
              e stato soglia €15.000 per regime sportivo dilettantistico.
            </p>
          </CardContent>
        </Card>
      </ResourceContent>
    </>
  )
}
