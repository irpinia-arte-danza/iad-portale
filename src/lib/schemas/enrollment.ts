import { z } from "zod"
import { endOfToday, uuidSchema } from "./common"

export const enrollmentCreateSchema = z.object({
  courseId: uuidSchema,
  enrollmentDate: z
    .date()
    .max(endOfToday(), {
      message: "La data di iscrizione non può essere nel futuro",
    })
    .optional(),
  notes: z.string().trim().max(500).optional(),
})

export const enrollmentUpdateSchema = z.object({
  notes: z.string().trim().max(500).optional(),
})

export const withdrawEnrollmentSchema = z.object({
  withdrawalDate: z.date().max(endOfToday(), {
    message: "La data di ritiro non può essere nel futuro",
  }),
})

export type EnrollmentCreateValues = z.infer<typeof enrollmentCreateSchema>
export type EnrollmentUpdateValues = z.infer<typeof enrollmentUpdateSchema>
export type WithdrawEnrollmentValues = z.infer<typeof withdrawEnrollmentSchema>
