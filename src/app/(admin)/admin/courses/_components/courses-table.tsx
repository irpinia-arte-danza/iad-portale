"use client"

import Link from "next/link"

import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { Badge } from "@/components/ui/badge"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"
import { formatEuro } from "@/lib/utils/format"
import { listName } from "@/lib/utils/person-name"

import { CourseRowActions } from "./course-row-actions"

type CourseRow = {
  id: string
  name: string
  type: keyof typeof COURSE_TYPE_LABELS
  description: string | null
  minAge: number | null
  maxAge: number | null
  level: string | null
  capacity: number
  monthlyFeeCents: number
  trimesterFeeCents: number | null
  teacherId: string | null
  isActive: boolean
  teacher: { id: string; firstName: string; lastName: string } | null
  teacherCourses?: {
    isPrimary: boolean
    teacher: { id: string; firstName: string; lastName: string }
  }[]
  _count: { enrollments: number }
}

type TeacherOption = {
  id: string
  firstName: string
  lastName: string
}

interface CoursesTableProps {
  courses: CourseRow[]
  teachers: TeacherOption[]
}

function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—"
  if (min !== null && max !== null) return `${min}–${max}`
  if (min !== null) return `${min}+`
  if (max !== null) return `fino a ${max}`
  return "—"
}

// Insegnanti del corso: la lista nuova (teacherCourses) se c'è, altrimenti
// il campo singolo di prima
function teacherNames(course: CourseRow): string[] {
  if (course.teacherCourses && course.teacherCourses.length > 0) {
    return course.teacherCourses.map((tc) => listName(tc.teacher))
  }
  return course.teacher ? [listName(course.teacher)] : []
}

export function CoursesTable({ courses, teachers }: CoursesTableProps) {
  // ── Colonne ─────────────────────────────────────────────────────────────
  // Alta: nome, iscritte e stato. Contributo e insegnante da 1024, età e
  // tipo da 1280.
  const columns: ListColumn<CourseRow>[] = [
    {
      key: "nome",
      header: "Nome",
      width: "md:flex-1",
      cell: (course) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/admin/courses/${course.id}`}
            className="truncate font-medium hover:underline"
          >
            {course.name}
          </Link>
          {course.level ? (
            <span className="truncate text-xs text-muted-foreground">
              {course.level}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      priority: "low",
      width: "md:w-32",
      cell: (course) => (
        <Badge variant="secondary">{COURSE_TYPE_LABELS[course.type]}</Badge>
      ),
    },
    {
      key: "eta",
      header: "Età",
      priority: "low",
      width: "md:w-20",
      cell: (course) => (
        <span className="text-sm">
          {formatAgeRange(course.minAge, course.maxAge)}
        </span>
      ),
    },
    {
      key: "contributo",
      header: "Contributo mensile",
      priority: "medium",
      width: "md:w-36",
      align: "right",
      cell: (course) => (
        <span className="font-mono text-sm">
          {formatEuro(course.monthlyFeeCents)}
        </span>
      ),
    },
    {
      key: "insegnante",
      header: "Insegnante",
      priority: "medium",
      width: "md:w-48",
      cell: (course) => {
        const names = teacherNames(course)
        return (
          <span className="truncate text-sm" title={names.join(", ")}>
            {names.length === 0 ? "—" : names.join(", ")}
          </span>
        )
      },
    },
    {
      key: "iscritte",
      header: "Iscritte",
      width: "md:w-24",
      align: "center",
      cell: (course) => (
        <span className="text-sm">
          <span className="font-medium">{course._count.enrollments}</span>
          <span className="text-muted-foreground">/{course.capacity}</span>
        </span>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      width: "md:w-28",
      cell: (course) =>
        course.isActive ? (
          <Badge>Attivo</Badge>
        ) : (
          <Badge variant="outline">Archiviato</Badge>
        ),
    },
  ]

  return (
    <ResponsiveList
      label="Corsi"
      items={courses}
      getId={(course) => course.id}
      columns={columns}
      empty={{
        title: "Nessun corso trovato",
        hint: "Prova a modificare la ricerca o aggiungi il primo corso.",
      }}
      // Le due righe della card: quante iscritte (su quante ne entrano) e chi
      // insegna. Il contributo sta con le iscritte: è la domanda che viene
      // dopo.
      cardLines={(course) => {
        const names = teacherNames(course)
        return [
          <span key="iscritte">
            {course._count.enrollments === 1
              ? "1 iscritta"
              : `${course._count.enrollments} iscritte`}{" "}
            su {course.capacity} ·{" "}
            <span className="font-mono">
              {formatEuro(course.monthlyFeeCents)}
            </span>{" "}
            al mese
          </span>,
          <span key="insegnante">
            {names.length === 0
              ? "Nessuna insegnante assegnata"
              : names.length === 1
                ? names[0]
                : names.join(", ")}
            {course.isActive ? "" : " · archiviato"}
          </span>,
        ]
      }}
      rowClassName={(course) =>
        course.isActive ? "hover:bg-muted/50" : "opacity-60 hover:bg-muted/50"
      }
      actions={(course) => (
        <CourseRowActions
          layout="responsive"
          course={course}
          teachers={teachers}
        />
      )}
    />
  )
}
