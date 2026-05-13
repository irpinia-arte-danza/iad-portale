import { z } from "zod"
import { StageAttendanceStatus } from "@prisma/client"

import { uuidSchema } from "./common"

const ATTENDANCE_VALUES = [
  "PRESENT",
  "ABSENT",
  "N_A",
] as const satisfies ReadonlyArray<StageAttendanceStatus>

export const STAGE_ATTENDANCE_LABELS: Record<StageAttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Assente",
  N_A: "N/A",
}

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const HHMM_MESSAGE = "Orario non valido (formato HH:mm)"

// Stage create / update
const baseStageObject = {
  title: z
    .string()
    .trim()
    .min(2, "Titolo obbligatorio (min 2 caratteri)")
    .max(120, "Titolo troppo lungo"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.date({ message: "Data obbligatoria" }),
  startTime: z
    .string()
    .regex(HHMM_REGEX, HHMM_MESSAGE),
  endTime: z.string().regex(HHMM_REGEX, HHMM_MESSAGE),
  location: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
  capacity: z
    .number({ message: "Capienza obbligatoria" })
    .int("La capienza dev'essere un intero")
    .min(1, "Capienza minima 1")
    .max(500, "Capienza massima 500"),
  feeEur: z
    .number({ message: "Quota obbligatoria" })
    .min(0, "Quota non può essere negativa")
    .max(2000, "Quota troppo alta"),
  registrationOpen: z.boolean(),
  registrationDeadline: z.date().nullable().optional(),
} as const

export const stageCreateSchema = z
  .object(baseStageObject)
  .refine((data) => data.startTime < data.endTime, {
    message: "L'ora di fine deve essere successiva all'inizio",
    path: ["endTime"],
  })
  .refine(
    (data) =>
      !data.registrationDeadline || data.registrationDeadline <= data.date,
    {
      message: "La scadenza iscrizioni non può essere dopo la data dello stage",
      path: ["registrationDeadline"],
    },
  )

export const stageUpdateSchema = stageCreateSchema

export const stageEnrollmentCreateSchema = z.object({
  stageId: uuidSchema,
  athleteId: uuidSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export const stageEnrollmentBulkCreateSchema = z.object({
  stageId: uuidSchema,
  athleteIds: z
    .array(uuidSchema)
    .min(1, "Seleziona almeno un'allieva")
    .max(50, "Massimo 50 allieve per volta"),
})

export const attendanceMarkSchema = z.object({
  stageId: uuidSchema,
  marks: z
    .array(
      z.object({
        enrollmentId: uuidSchema,
        status: z.enum(ATTENDANCE_VALUES).nullable(),
      }),
    )
    .min(1, "Nessuna presenza da aggiornare")
    .max(500, "Troppe presenze in un solo batch"),
})

export type StageCreateValues = z.infer<typeof stageCreateSchema>
export type StageUpdateValues = z.infer<typeof stageUpdateSchema>
export type StageEnrollmentCreateValues = z.infer<typeof stageEnrollmentCreateSchema>
export type StageEnrollmentBulkCreateValues = z.infer<
  typeof stageEnrollmentBulkCreateSchema
>
export type AttendanceMarkValues = z.infer<typeof attendanceMarkSchema>
