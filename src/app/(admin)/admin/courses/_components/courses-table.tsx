"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

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

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—"
  if (min !== null && max !== null) return `${min}–${max}`
  if (min !== null) return `${min}+`
  if (max !== null) return `fino a ${max}`
  return "—"
}

export function CoursesTable({ courses, teachers }: CoursesTableProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessun corso trovato</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova a modificare la ricerca o aggiungi il primo corso.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Età</TableHead>
            <TableHead className="hidden md:table-cell font-mono">
              Quota mensile
            </TableHead>
            <TableHead className="hidden lg:table-cell">Insegnante</TableHead>
            <TableHead className="text-center">Iscrizioni</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow
              key={course.id}
              className={
                course.isActive
                  ? "hover:bg-muted/50"
                  : "opacity-60 hover:bg-muted/50"
              }
            >
              <TableCell>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="block hover:underline"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{course.name}</span>
                    {course.level && (
                      <span className="text-xs text-muted-foreground">
                        {course.level}
                      </span>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="secondary">
                  {COURSE_TYPE_LABELS[course.type]}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatAgeRange(course.minAge, course.maxAge)}
              </TableCell>
              <TableCell className="hidden md:table-cell font-mono text-right">
                {euroFormatter.format(course.monthlyFeeCents / 100)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {course.teacher
                  ? `${course.teacher.lastName} ${course.teacher.firstName}`
                  : "—"}
              </TableCell>
              <TableCell className="text-center">
                {course._count.enrollments}
              </TableCell>
              <TableCell>
                {course.isActive ? (
                  <Badge>Attivo</Badge>
                ) : (
                  <Badge variant="outline">Archiviato</Badge>
                )}
              </TableCell>
              <TableCell>
                <CourseRowActions course={course} teachers={teachers} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
