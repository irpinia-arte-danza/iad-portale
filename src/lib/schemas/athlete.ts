import { z } from "zod"
import { Gender } from "@prisma/client"

import {
  emailOptionalSchema,
  endOfToday,
  fiscalCodeSchema,
  nonEmptyStringSchema,
  phoneSchema,
} from "./common"

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
    .max(endOfToday(), {
      message: "La data di nascita non può essere nel futuro",
    }),
  gender: z.enum(Gender),

  // Contatti dell'allieva. Facoltativi: per le minorenni le comunicazioni
  // vanno ai genitori e questi campi restano vuoti. Diventano l'unico
  // recapito per le maggiorenni senza genitori collegati (il corso adulti):
  // senza email non ricevono ricevute, solleciti, inviti agli stage, e non
  // possono avere l'accesso all'area riservata.
  //
  // Stessa validazione dei genitori — è lo stesso controllo di formato di
  // emailRequiredSchema e phoneRequiredSchema, solo senza l'obbligo.
  email: emailOptionalSchema,
  phone: phoneSchema,

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
