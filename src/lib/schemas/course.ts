import { z } from "zod"

import { nonEmptyStringSchema } from "./common"

export const COURSE_TYPES = [
  "GIOCO_DANZA",
  "PROPEDEUTICA",
  "DANZA_CLASSICA",
  "DANZA_MODERNA",
  "DANZA_CONTEMPORANEA",
  "OTHER",
] as const

export const COURSE_TYPE_LABELS: Record<(typeof COURSE_TYPES)[number], string> = {
  GIOCO_DANZA: "Gioco Danza",
  PROPEDEUTICA: "Propedeutica",
  DANZA_CLASSICA: "Danza Classica",
  DANZA_MODERNA: "Danza Moderna",
  DANZA_CONTEMPORANEA: "Danza Contemporanea",
  OTHER: "Altro",
}

// Sprint 5: TeacherCourse M2M (con isPrimary). Sostituisce teacherId 1:N
// legacy. Mantenuto teacherId nel schema per backward compat caller
// che passano ancora il singolo (es. seed o tooling). Form admin usa
// solo `teachers`.
export const teacherCourseLinkSchema = z.object({
  teacherId: z.string().uuid({ message: "Insegnante non valido" }),
  isPrimary: z.boolean(),
})

export const courseCreateSchema = z
  .object({
    name: nonEmptyStringSchema("Nome"),
    type: z.enum(COURSE_TYPES, { message: "Tipo corso non valido" }),
    description: z.string().trim().max(500).optional(),
    minAge: z.number().int().min(2).max(99).optional(),
    maxAge: z.number().int().min(2).max(99).optional(),
    level: z.string().trim().max(50).optional(),
    capacity: z.number().int().min(1).max(999),
    monthlyFeeEur: z.number().min(0).max(1000),
    trimesterFeeEur: z.number().min(0).max(3000).optional(),
    teachers: z.array(teacherCourseLinkSchema).max(5).optional(),
    // Legacy 1:N (deprecated): popolato dall'action col primary teacher
    // dell'array `teachers`. Form admin non lo invia più.
    teacherId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      data.minAge === undefined ||
      data.maxAge === undefined ||
      data.minAge <= data.maxAge,
    {
      message: "Età minima deve essere minore o uguale alla massima",
      path: ["maxAge"],
    },
  )
  .refine(
    (data) => {
      if (!data.teachers || data.teachers.length === 0) return true
      const primaries = data.teachers.filter((t) => t.isPrimary).length
      return primaries === 1
    },
    {
      message: "Seleziona esattamente un insegnante principale",
      path: ["teachers"],
    },
  )
  .refine(
    (data) => {
      if (!data.teachers) return true
      const ids = data.teachers.map((t) => t.teacherId)
      return new Set(ids).size === ids.length
    },
    {
      message: "Stesso insegnante selezionato più volte",
      path: ["teachers"],
    },
  )

export const courseUpdateSchema = courseCreateSchema

export type CourseCreateValues = z.infer<typeof courseCreateSchema>
export type CourseUpdateValues = z.infer<typeof courseUpdateSchema>
export type TeacherCourseLink = z.infer<typeof teacherCourseLinkSchema>
