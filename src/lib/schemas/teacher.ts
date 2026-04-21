import { z } from "zod"

import {
  emailOptionalSchema,
  fiscalCodeSchema,
  nonEmptyStringSchema,
  phoneSchema,
} from "./common"

export const teacherCreateSchema = z.object({
  firstName: nonEmptyStringSchema("Nome"),
  lastName: nonEmptyStringSchema("Cognome"),
  email: emailOptionalSchema,
  phone: phoneSchema,
  fiscalCode: fiscalCodeSchema,
  qualifications: z.string().trim().max(500).optional(),
})

export const teacherUpdateSchema = teacherCreateSchema.partial()

export type TeacherCreateValues = z.infer<typeof teacherCreateSchema>
export type TeacherUpdateValues = z.infer<typeof teacherUpdateSchema>
