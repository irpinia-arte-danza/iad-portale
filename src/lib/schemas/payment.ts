import { z } from "zod"
import { FeeType, PaymentMethod } from "@prisma/client"

import { endOfToday, uuidSchema } from "./common"

const FEE_TYPE_VALUES = [
  "ASSOCIATION",
  "MONTHLY",
  "TRIMESTER",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
] as const satisfies ReadonlyArray<FeeType>

const PAYMENT_METHOD_VALUES = [
  "CASH",
  "TRANSFER",
  "POS",
  "SUMUP_LINK",
  "OTHER",
] as const satisfies ReadonlyArray<PaymentMethod>

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  ASSOCIATION: "Quota iscrizione",
  MONTHLY: "Quota mensile",
  TRIMESTER: "Quota trimestrale",
  STAGE: "Stage",
  SHOWCASE_1: "Saggio (1° acconto)",
  SHOWCASE_2: "Saggio (saldo)",
  COSTUME: "Costume",
  TRIAL_LESSON: "Lezione di prova",
  OTHER: "Altro",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Contanti",
  TRANSFER: "Bonifico",
  POS: "POS",
  SUMUP_LINK: "Link SumUp",
  OTHER: "Altro",
}

export const paymentCreateSchema = z
  .object({
    athleteId: uuidSchema,
    parentId: z.string().uuid().optional().or(z.literal("")),
    courseEnrollmentId: z.string().uuid().optional().or(z.literal("")),
    feeType: z.enum(FEE_TYPE_VALUES, { message: "Tipo quota non valido" }),
    method: z.enum(PAYMENT_METHOD_VALUES, { message: "Metodo non valido" }),
    amountEur: z
      .number({ message: "Importo obbligatorio" })
      .min(0.01, "Importo deve essere positivo")
      .max(10000, "Importo troppo alto"),
    paymentDate: z.date().max(endOfToday(), {
      message: "La data di pagamento non può essere nel futuro",
    }),
    periodStart: z.date().optional(),
    periodEnd: z.date().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.periodStart && data.periodEnd) {
        return data.periodStart <= data.periodEnd
      }
      return true
    },
    {
      message: "Fine periodo deve essere successiva all'inizio",
      path: ["periodEnd"],
    },
  )

export const paymentUpdateSchema = z.object({
  notes: z.string().trim().max(500).optional(),
})

export const paymentReverseSchema = z.object({
  reversalReason: z
    .string()
    .trim()
    .min(3, "Motivo storno obbligatorio (min 3 caratteri)")
    .max(500, "Motivo troppo lungo (max 500 caratteri)"),
})

export type PaymentCreateValues = z.infer<typeof paymentCreateSchema>
export type PaymentUpdateValues = z.infer<typeof paymentUpdateSchema>
export type PaymentReverseValues = z.infer<typeof paymentReverseSchema>
