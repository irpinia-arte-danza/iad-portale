import { z } from "zod"

const LABEL_REGEX = /^\d{4}-\d{4}$/

export const academicYearSchema = z
  .object({
    label: z
      .string()
      .trim()
      .regex(LABEL_REGEX, { message: 'Formato "YYYY-YYYY" (es. 2025-2026)' }),
    startDate: z.date(),
    endDate: z.date(),
    associationFeeEur: z
      .number()
      .min(0, { message: "Quota non valida" })
      .max(1000),
    monthlyRenewalDay: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional(),
  })
  .refine((d) => d.startDate < d.endDate, {
    message: "Data fine deve essere successiva all'inizio",
    path: ["endDate"],
  })
  .refine(
    (d) => {
      const [start, end] = d.label.split("-").map(Number)
      return end === start + 1
    },
    {
      message: "Anni nel label devono essere consecutivi (es. 2025-2026)",
      path: ["label"],
    },
  )

export type AcademicYearValues = z.infer<typeof academicYearSchema>
