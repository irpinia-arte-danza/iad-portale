import { z } from "zod"
import { Gender } from "@prisma/client"

import { fiscalCodeSchema, nonEmptyStringSchema } from "./common"

export const genderOptions = [
  { value: Gender.F, label: "Femmina" },
  { value: Gender.M, label: "Maschio" },
  { value: Gender.OTHER, label: "Altro" },
] as const

export const athleteCreateSchema = z.object({
  firstName: nonEmptyStringSchema("Nome"),
  lastName: nonEmptyStringSchema("Cognome"),
  dateOfBirth: z
    .date({ message: "Data di nascita obbligatoria" })
    .max(new Date(), { message: "La data di nascita non può essere nel futuro" }),
  gender: z.enum(Gender),

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

  instructorNotes: z
    .string()
    .max(1000, "Note troppo lunghe (max 1000 caratteri)")
    .optional(),
})

export const athleteUpdateSchema = athleteCreateSchema.partial()

export type AthleteCreateValues = z.infer<typeof athleteCreateSchema>
export type AthleteUpdateValues = z.infer<typeof athleteUpdateSchema>
