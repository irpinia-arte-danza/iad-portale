import { z } from "zod"

export const waiveScheduleSchema = z.object({
  waiverReason: z
    .string()
    .trim()
    .min(3, "Motivo esenzione obbligatorio (min 3 caratteri)")
    .max(500, "Motivo troppo lungo (max 500 caratteri)"),
})

export type WaiveScheduleValues = z.infer<typeof waiveScheduleSchema>
