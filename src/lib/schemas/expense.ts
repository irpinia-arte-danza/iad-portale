import { z } from "zod"
import { ExpenseType, PaymentMethod } from "@prisma/client"

import { endOfToday } from "./common"

const EXPENSE_TYPE_VALUES = [
  "RENT",
  "TAX_F24",
  "UTILITY",
  "COMPENSATION",
  "COSTUME_PURCHASE",
  "MATERIAL",
  "INSURANCE",
  "AFFILIATION",
  "OTHER",
] as const satisfies ReadonlyArray<ExpenseType>

const PAYMENT_METHOD_VALUES = [
  "CASH",
  "TRANSFER",
  "POS",
  "SUMUP_LINK",
  "OTHER",
] as const satisfies ReadonlyArray<PaymentMethod>

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  RENT: "Affitto",
  TAX_F24: "F24",
  UTILITY: "Utenze",
  COMPENSATION: "Compenso sportivo",
  COSTUME_PURCHASE: "Acquisto costumi",
  MATERIAL: "Materiale tecnico",
  INSURANCE: "Assicurazione",
  AFFILIATION: "Affiliazione ente",
  OTHER: "Altro",
}

export const expenseCreateSchema = z.object({
  type: z.enum(EXPENSE_TYPE_VALUES, { message: "Tipo spesa non valido" }),
  method: z.enum(PAYMENT_METHOD_VALUES, { message: "Metodo non valido" }),
  amountEur: z
    .number({ message: "Importo obbligatorio" })
    .min(0.01, "Importo deve essere positivo")
    .max(100000, "Importo troppo alto"),
  expenseDate: z.date().max(endOfToday(), {
    message: "La data della spesa non può essere nel futuro",
  }),
  description: z
    .string()
    .trim()
    .min(1, "Causale obbligatoria")
    .max(200, "Causale troppo lunga (max 200 caratteri)"),
  recipient: z
    .string()
    .trim()
    .max(200, "Nome fornitore troppo lungo (max 200 caratteri)")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Note troppo lunghe (max 1000 caratteri)")
    .optional(),
})

export const expenseUpdateSchema = expenseCreateSchema

export type ExpenseCreateValues = z.infer<typeof expenseCreateSchema>
export type ExpenseUpdateValues = z.infer<typeof expenseUpdateSchema>
