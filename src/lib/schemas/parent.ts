import { z } from "zod"
import {
  emailOptionalSchema,
  phoneSchema,
  fiscalCodeSchema,
  nonEmptyStringSchema,
} from "./common"

// Relationship enum values per UI dropdown
export const parentRelationshipOptions = [
  { value: "MOTHER", label: "Madre" },
  { value: "FATHER", label: "Padre" },
  { value: "GRANDPARENT", label: "Nonno/Nonna" },
  { value: "TUTOR", label: "Tutore" },
  { value: "OTHER", label: "Altro" },
] as const

// Schema create (form)
export const parentCreateSchema = z.object({
  firstName: nonEmptyStringSchema("Nome"),
  lastName: nonEmptyStringSchema("Cognome"),
  email: emailOptionalSchema,
  phone: phoneSchema,
  fiscalCode: fiscalCodeSchema,
  receivesEmailCommunications: z.boolean(),
  remindersEnabled: z.boolean(),
})

// Schema update (parziale)
export const parentUpdateSchema = parentCreateSchema.partial()

// Type inferred per form
export type ParentCreateValues = z.infer<typeof parentCreateSchema>
export type ParentUpdateValues = z.infer<typeof parentUpdateSchema>
