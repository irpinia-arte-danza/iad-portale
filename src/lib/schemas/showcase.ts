import { z } from "zod"
import { PaymentMode } from "@prisma/client"

import { uuidSchema } from "./common"

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  SINGLE: "Quota unica",
  SPLIT: "Caparra + Saldo",
}

const PAYMENT_MODE_VALUES = [
  "SINGLE",
  "SPLIT",
] as const satisfies ReadonlyArray<PaymentMode>

// Showcase create / update
const baseShowcaseObject = {
  title: z
    .string()
    .trim()
    .min(2, "Titolo obbligatorio (min 2 caratteri)")
    .max(120, "Titolo troppo lungo"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.date({ message: "Data saggio obbligatoria" }),
  location: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
  rehearsalDate: z.date().nullable().optional(),
  firstInstallmentEur: z
    .number({ message: "Caparra obbligatoria" })
    .min(0, "Caparra non può essere negativa")
    .max(2000, "Caparra troppo alta"),
  secondInstallmentEur: z
    .number({ message: "Saldo obbligatorio" })
    .min(0, "Saldo non può essere negativo")
    .max(2000, "Saldo troppo alto"),
  firstDeadline: z.date({ message: "Scadenza caparra obbligatoria" }),
  secondDeadline: z.date({ message: "Scadenza saldo obbligatoria" }),
} as const

export const showcaseCreateSchema = z
  .object({
    ...baseShowcaseObject,
    academicYearId: uuidSchema,
  })
  .refine((d) => d.firstDeadline < d.secondDeadline, {
    message: "La scadenza saldo deve essere successiva alla caparra",
    path: ["secondDeadline"],
  })
  .refine((d) => d.secondDeadline <= d.date, {
    message:
      "La scadenza saldo non può essere dopo la data del saggio",
    path: ["secondDeadline"],
  })

export const showcaseUpdateSchema = z
  .object(baseShowcaseObject)
  .refine((d) => d.firstDeadline < d.secondDeadline, {
    message: "La scadenza saldo deve essere successiva alla caparra",
    path: ["secondDeadline"],
  })
  .refine((d) => d.secondDeadline <= d.date, {
    message:
      "La scadenza saldo non può essere dopo la data del saggio",
    path: ["secondDeadline"],
  })

export const participationCreateSchema = z.object({
  showcaseId: uuidSchema,
  athleteId: uuidSchema,
  choreography: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export const participationBulkCreateSchema = z.object({
  showcaseId: uuidSchema,
  athleteIds: z
    .array(uuidSchema)
    .min(1, "Seleziona almeno un'allieva")
    .max(100, "Massimo 100 allieve per volta"),
})

export const confirmParticipationSchema = z.object({
  participationId: uuidSchema,
  paymentMode: z.enum(PAYMENT_MODE_VALUES),
})

export const updateChoreographySchema = z.object({
  participationId: uuidSchema,
  choreography: z.string().trim().max(200).optional().or(z.literal("")),
})

export type ShowcaseCreateValues = z.infer<typeof showcaseCreateSchema>
export type ShowcaseUpdateValues = z.infer<typeof showcaseUpdateSchema>
export type ParticipationCreateValues = z.infer<typeof participationCreateSchema>
export type ParticipationBulkCreateValues = z.infer<
  typeof participationBulkCreateSchema
>
export type ConfirmParticipationValues = z.infer<
  typeof confirmParticipationSchema
>
export type UpdateChoreographyValues = z.infer<typeof updateChoreographySchema>
