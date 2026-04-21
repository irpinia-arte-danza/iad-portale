"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

type CourseType = keyof typeof COURSE_TYPE_LABELS

interface CourseInfoDisplayProps {
  course: {
    name: string
    type: CourseType
    description: string | null
    minAge: number | null
    maxAge: number | null
    level: string | null
    capacity: number
    monthlyFeeCents: number
    trimesterFeeCents: number | null
    isActive: boolean
    teacher: { id: string; firstName: string; lastName: string } | null
  }
  currentAcademicYearLabel: string | null
}

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—"
  if (min !== null && max !== null) return `${min}–${max} anni`
  if (min !== null) return `${min}+ anni`
  if (max !== null) return `fino a ${max} anni`
  return "—"
}

export function CourseInfoDisplay({
  course,
  currentAcademicYearLabel,
}: CourseInfoDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Informazioni corso</CardTitle>
            <CardDescription>
              {COURSE_TYPE_LABELS[course.type]}
              {course.level ? ` · ${course.level}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentAcademicYearLabel && (
              <Badge variant="outline" className="font-mono text-xs">
                AA {currentAcademicYearLabel}
              </Badge>
            )}
            {course.isActive ? (
              <Badge>Attivo</Badge>
            ) : (
              <Badge variant="outline">Archiviato</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Età</dt>
            <dd>{formatAgeRange(course.minAge, course.maxAge)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Capienza</dt>
            <dd>
              {course.capacity}{" "}
              {course.capacity === 1 ? "posto" : "posti"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quota mensile</dt>
            <dd className="font-mono">
              {euroFormatter.format(course.monthlyFeeCents / 100)}
            </dd>
          </div>
          {course.trimesterFeeCents !== null && (
            <div>
              <dt className="text-xs text-muted-foreground">
                Quota trimestrale
              </dt>
              <dd className="font-mono">
                {euroFormatter.format(course.trimesterFeeCents / 100)}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Insegnante</dt>
            <dd>
              {course.teacher
                ? `${course.teacher.lastName} ${course.teacher.firstName}`
                : "—"}
            </dd>
          </div>
        </dl>

        {course.description && (
          <div className="border-t pt-4">
            <h4 className="text-xs text-muted-foreground mb-1">Descrizione</h4>
            <p className="text-sm whitespace-pre-wrap">{course.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
