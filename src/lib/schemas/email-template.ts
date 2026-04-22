import { z } from "zod"

export const emailTemplateEditSchema = z.object({
  subject: z
    .string()
    .min(1, "Oggetto obbligatorio")
    .max(200, "Max 200 caratteri"),
  bodyHtml: z.string().min(1, "Corpo HTML obbligatorio"),
  bodyText: z.string().nullable().optional(),
  isActive: z.boolean(),
})

export type EmailTemplateEditInput = z.infer<typeof emailTemplateEditSchema>
