import { z } from "zod"
import {
  emailRequiredSchema,
  endOfToday,
  phoneRequiredSchema,
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
  email: emailRequiredSchema,
  phone: phoneRequiredSchema,
  receivesEmailCommunications: z.boolean(),
  remindersEnabled: z.boolean(),

  dateOfBirth: z
    .date()
    .max(endOfToday(), {
      message: "La data di nascita non può essere nel futuro",
    })
    .optional(),
  fiscalCode: fiscalCodeSchema,
  placeOfBirth: z.string().trim().max(100).optional(),
  provinceOfBirth: z
    .string()
    .trim()
    .length(2, "Provincia: 2 lettere (es. AV)")
    .toUpperCase()
    .optional()
    .or(z.literal("")),

  residenceStreet: z.string().trim().max(200).optional(),
  residenceNumber: z.string().trim().max(20).optional(),
  residenceCity: z.string().trim().max(100).optional(),
  residenceProvince: z
    .string()
    .trim()
    .length(2, "Provincia: 2 lettere (es. AV)")
    .toUpperCase()
    .optional()
    .or(z.literal("")),
  residenceCap: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "CAP: 5 cifre")
    .optional()
    .or(z.literal("")),
})

// Schema update (parziale)
export const parentUpdateSchema = parentCreateSchema.partial()

// Type inferred per form
export type ParentCreateValues = z.infer<typeof parentCreateSchema>
export type ParentUpdateValues = z.infer<typeof parentUpdateSchema>
