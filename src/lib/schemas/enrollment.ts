import { z } from "zod"

import { FIRST_MONTH_CHOICES } from "@/lib/fees/first-month"
import { isNotInFuture, uuidSchema } from "./common"

export const enrollmentCreateSchema = z.object({
  courseId: uuidSchema,
  enrollmentDate: z
    .date()
    .refine(isNotInFuture, {
      message: "La data di iscrizione non può essere nel futuro",
    })
    .optional(),
  notes: z.string().trim().max(500).optional(),
  // Rata del mese di iscrizione, se l'iscrizione è dopo il 15
  // (src/lib/fees/first-month.ts). Assente = dovuto intero, come sempre
  firstMonth: z.enum(FIRST_MONTH_CHOICES).optional(),
  // Solo con "REDUCED": importo in centesimi, maggiore di zero (il tetto è il
  // contributo del corso, controllato dalla action)
  firstMonthAmountCents: z.number().int().positive().optional(),
}).refine(
  (v) => v.firstMonth !== "REDUCED" || (v.firstMonthAmountCents ?? 0) > 0,
  { message: "Indica l'importo ridotto", path: ["firstMonthAmountCents"] },
)

export const enrollmentUpdateSchema = z.object({
  notes: z.string().trim().max(500).optional(),
})

export const withdrawEnrollmentSchema = z.object({
  withdrawalDate: z.date().refine(isNotInFuture, {
    message: "La data di ritiro non può essere nel futuro",
  }),
})

export type EnrollmentCreateValues = z.infer<typeof enrollmentCreateSchema>
export type EnrollmentUpdateValues = z.infer<typeof enrollmentUpdateSchema>
export type WithdrawEnrollmentValues = z.infer<typeof withdrawEnrollmentSchema>
