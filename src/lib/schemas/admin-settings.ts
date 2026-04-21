import { z } from "zod"

import {
  emailRequiredSchema,
  nonEmptyStringSchema,
  phoneSchema,
} from "./common"
import {
  hexColorSchema,
  ibanSchema,
  italianVatSchema,
  organizationFiscalCodeSchema,
  pecSchema,
  sdiCodeSchema,
} from "./fiscal-validators"

// Telefono ASD: regex permissiva (accetta formati internazionali + locali)
const ASD_PHONE_REGEX = /^[\d\s+\-()]{6,}$/

// ============================================================================
// Tab Associazione
// ============================================================================
export const associationSchema = z
  .object({
    asdName: nonEmptyStringSchema("Denominazione"),
    asdFiscalCode: organizationFiscalCodeSchema,
    asdVatNumber: italianVatSchema,
    asdEmail: emailRequiredSchema,
    asdPec: pecSchema,
    asdPhone: z
      .string()
      .trim()
      .regex(ASD_PHONE_REGEX, { message: "Telefono non valido" })
      .optional()
      .or(z.literal("")),
    asdWebsite: z
      .string()
      .trim()
      .url({ message: "URL non valido (es. https://...)" })
      .optional()
      .or(z.literal("")),
    asdIban: ibanSchema,
    asdSdiCode: sdiCodeSchema,

    // Indirizzo legale (tutti required)
    addressStreet: z
      .string()
      .trim()
      .min(1, { message: "Via e numero civico richiesti" })
      .max(200, { message: "Via max 200 caratteri" }),
    addressZip: z
      .string()
      .trim()
      .regex(/^\d{5}$/, { message: "CAP deve essere 5 cifre" }),
    addressCity: z
      .string()
      .trim()
      .min(1, { message: "Città richiesta" })
      .max(100, { message: "Città max 100 caratteri" }),
    addressProvince: z
      .string()
      .trim()
      .length(2, { message: "Sigla provincia 2 lettere" })
      .transform((s) => s.toUpperCase()),

    gymSameAsLegal: z.boolean(),
    gymAddress: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.gymSameAsLegal ||
      (d.gymAddress !== undefined && d.gymAddress.trim().length > 0),
    {
      message: "Indirizzo palestra obbligatorio se diverso dalla sede legale",
      path: ["gymAddress"],
    },
  )

export type AssociationValues = z.infer<typeof associationSchema>

// ============================================================================
// Tab Brand
// ============================================================================
export const brandSchema = z.object({
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
})

export type BrandValues = z.infer<typeof brandSchema>

// ============================================================================
// Tab Ricevute
// ============================================================================
export const ricevuteSchema = z.object({
  receiptPrefix: z
    .string()
    .trim()
    .min(1, { message: "Prefisso obbligatorio" })
    .max(20, { message: "Prefisso max 20 caratteri" })
    .regex(/^[A-Za-z0-9/_-]+$/, {
      message: "Caratteri ammessi: A-Z 0-9 / _ -",
    }),
  receiptNumber: z
    .number()
    .int()
    .min(0, { message: "Il contatore deve essere ≥ 0" })
    .max(9_999_999, { message: "Contatore troppo grande" }),
  receiptFooter: z
    .string()
    .trim()
    .max(500, { message: "Footer max 500 caratteri" })
    .optional()
    .or(z.literal("")),
})

export type RicevuteValues = z.infer<typeof ricevuteSchema>

// ============================================================================
// Tab Account — profilo personale
// ============================================================================
export const profileSchema = z.object({
  firstName: nonEmptyStringSchema("Nome"),
  lastName: nonEmptyStringSchema("Cognome"),
  email: emailRequiredSchema,
  phone: phoneSchema,
  themePreference: z.enum(["light", "dark", "system"]),
  localePreference: z.enum(["it", "en"]),
})

export type ProfileValues = z.infer<typeof profileSchema>

// Password change
export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, { message: "Minimo 10 caratteri" })
      .max(72, { message: "Massimo 72 caratteri" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

// ============================================================================
// Tab Admin — invite
// ============================================================================
export const adminInviteSchema = z.object({
  email: emailRequiredSchema,
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
})

export type AdminInviteValues = z.infer<typeof adminInviteSchema>
