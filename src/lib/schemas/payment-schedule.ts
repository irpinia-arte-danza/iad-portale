import { z } from "zod"

export const waiveScheduleSchema = z.object({
  waiverReason: z
    .string()
    .trim()
    .min(3, "Indica il motivo (almeno 3 caratteri)")
    .max(500, "Motivo troppo lungo (max 500 caratteri)"),
})

export type WaiveScheduleValues = z.infer<typeof waiveScheduleSchema>
