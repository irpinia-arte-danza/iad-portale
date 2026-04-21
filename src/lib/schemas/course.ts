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

export const courseUpdateSchema = courseCreateSchema

export type CourseCreateValues = z.infer<typeof courseCreateSchema>
export type CourseUpdateValues = z.infer<typeof courseUpdateSchema>
