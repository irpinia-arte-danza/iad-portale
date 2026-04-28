import { z } from "zod"

import { uuidSchema } from "./common"

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const

export const courseScheduleSchema = z
  .object({
    courseId: uuidSchema,
    dayOfWeek: z
      .number()
      .int()
      .min(0, { message: "Giorno non valido" })
      .max(6, { message: "Giorno non valido" }),
    startTime: z
      .string()
      .regex(TIME_REGEX, { message: "Formato orario HH:MM (00:00–23:59)" }),
    endTime: z
      .string()
      .regex(TIME_REGEX, { message: "Formato orario HH:MM (00:00–23:59)" }),
    location: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal("")),
    validFrom: z.date(),
    validTo: z.date().optional().nullable(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "Orario fine deve essere successivo all'inizio",
    path: ["endTime"],
  })
  .refine((d) => !d.validTo || d.validFrom <= d.validTo, {
    message: "Data fine validità deve essere successiva all'inizio",
    path: ["validTo"],
  })

export type CourseScheduleValues = z.infer<typeof courseScheduleSchema>
