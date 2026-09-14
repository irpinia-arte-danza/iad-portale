"use server"

import { after } from "next/server"
import { z } from "zod"

import { sendPasswordResetCore } from "@/lib/auth/access-emails"
import type { ActionResult } from "@/lib/schemas/common"

const requestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Inserisci la tua email" })
    .email({ message: "Email non valida" }),
})

// Risposta identica per email registrate e non: l'invio vero avviene dopo
// la risposta (after), così nemmeno i tempi rivelano se l'account esiste.
export async function requestPasswordReset(values: {
  email: string
}): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Email non valida",
    }
  }

  const email = parsed.data.email
  after(async () => {
    try {
      await sendPasswordResetCore(email)
    } catch (error) {
      console.error("[password reset] unexpected error", {
        message: error instanceof Error ? error.message : "unknown",
      })
    }
  })

  return { ok: true }
}
