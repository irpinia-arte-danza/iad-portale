import { z } from "zod"
import { ParentRelationship } from "@prisma/client"

import {
  emailOptionalSchema,
  nonEmptyStringSchema,
  phoneSchema,
} from "./common"

export const relationshipOptions = [
  { value: ParentRelationship.MOTHER, label: "Madre" },
  { value: ParentRelationship.FATHER, label: "Padre" },
  { value: ParentRelationship.GRANDPARENT, label: "Nonno/a" },
  { value: ParentRelationship.TUTOR, label: "Tutore" },
  { value: ParentRelationship.OTHER, label: "Altro" },
] as const

export const guardianRelationSchema = z.object({
  relationship: z.enum(ParentRelationship),
  isPrimaryContact: z.boolean(),
  isPrimaryPayer: z.boolean(),
  isPickupAuthorized: z.boolean(),
  hasParentalAuthority: z.boolean(),
})

export type GuardianRelationValues = z.infer<typeof guardianRelationSchema>

export const newGuardianParentSchema = z.object({
  firstName: nonEmptyStringSchema("Nome"),
  lastName: nonEmptyStringSchema("Cognome"),
  email: emailOptionalSchema,
  phone: phoneSchema,
})

export type NewGuardianParentValues = z.infer<typeof newGuardianParentSchema>
