"use client"

import { unstable_rethrow } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import type {
  AccessInviteResult,
  AccessProfileKind,
} from "@/lib/auth/access-status-types"

import { sendAthleteAccessInvite } from "../../athletes/access-actions"
import { sendAccessInvite } from "../../parents/actions"
import { sendTeacherAccessInvite } from "../../teachers/actions"

// Invio singolo di "Invia / Reinvia accesso". La action fa revalidatePath,
// quindi badge e date si aggiornano da soli dopo il toast.
export function useSendAccessInvite(kind: AccessProfileKind) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function send(profileId: string) {
    setPendingId(profileId)
    try {
      const result: AccessInviteResult =
        kind === "PARENT"
          ? await sendAccessInvite(profileId)
          : kind === "TEACHER"
            ? await sendTeacherAccessInvite(profileId)
            : await sendAthleteAccessInvite(profileId)

      if (result.ok) {
        toast.success(
          result.reinvite
            ? "Nuovo link di accesso inviato: quello precedente non vale più"
            : "Email di accesso inviata",
        )
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      // requireAdmin() nella action può fare redirect (sessione scaduta):
      // non è un errore di invio.
      unstable_rethrow(error)
      toast.error("Invio non riuscito: controlla la connessione e riprova")
    } finally {
      setPendingId(null)
    }
  }

  return { send, pendingId }
}
