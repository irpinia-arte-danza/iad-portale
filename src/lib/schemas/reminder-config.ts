import { z } from "zod"

export const reminderConfigSchema = z
  .object({
    enabled: z.boolean(),
    daysBeforeDue: z
      .number({ message: "Deve essere un numero" })
      .int("Solo numeri interi")
      .min(0, "Min 0")
      .max(30, "Max 30"),
    firstReminderDaysAfter: z
      .number({ message: "Deve essere un numero" })
      .int("Solo numeri interi")
      .min(1, "Min 1")
      .max(30, "Max 30"),
    secondReminderDaysAfter: z
      .number({ message: "Deve essere un numero" })
      .int("Solo numeri interi")
      .min(2, "Min 2")
      .max(60, "Max 60"),
    excludeWeekends: z.boolean(),
  })
  .refine(
    (v) => v.secondReminderDaysAfter > v.firstReminderDaysAfter,
    {
      message: "Il secondo sollecito deve avvenire dopo il primo",
      path: ["secondReminderDaysAfter"],
    },
  )

export type ReminderConfigValues = z.infer<typeof reminderConfigSchema>
