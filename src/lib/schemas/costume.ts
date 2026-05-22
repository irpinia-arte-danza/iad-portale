import { z } from "zod"

import { uuidSchema } from "./common"

const baseCostumeObject = {
  name: z
    .string()
    .trim()
    .min(2, "Nome obbligatorio (min 2 caratteri)")
    .max(120, "Nome troppo lungo"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  costEur: z
    .number({ message: "Costo obbligatorio" })
    .min(0, "Costo non può essere negativo")
    .max(2000, "Costo troppo alto"),
} as const

export const costumeCreateSchema = z.object({
  ...baseCostumeObject,
  showcaseId: uuidSchema,
})

export const costumeUpdateSchema = z.object(baseCostumeObject)

export const assignCostumeSchema = z.object({
  costumeId: uuidSchema,
  participationId: uuidSchema,
  size: z.string().trim().max(50).optional().or(z.literal("")),
})

export const updateAssignmentSizeSchema = z.object({
  assignmentId: uuidSchema,
  size: z.string().trim().max(50).optional().or(z.literal("")),
})

export type CostumeCreateValues = z.infer<typeof costumeCreateSchema>
export type CostumeUpdateValues = z.infer<typeof costumeUpdateSchema>
export type AssignCostumeValues = z.infer<typeof assignCostumeSchema>
export type UpdateAssignmentSizeValues = z.infer<
  typeof updateAssignmentSizeSchema
>
