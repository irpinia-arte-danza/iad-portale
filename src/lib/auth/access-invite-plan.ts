import { isInvitable, type AccessStatus } from "./access-status-types"

// ─────────────────────────────────────────────────────────────────────────
// Chi riceve l'invito di gruppo, e chi viene saltato.
//
// Nessuna regola nuova: decide `isInvitable`, la stessa che usano il tasto
// di riga e l'azione di invio. Qui si aggiunge solo il perché di chi resta
// fuori, da mostrare prima di premere Invia — selezionare cinque genitori e
// scoprire dopo che ne sono partiti tre è il modo sbagliato di saperlo.
// ─────────────────────────────────────────────────────────────────────────

export type InviteCandidate = {
  id: string
  name: string
  status: AccessStatus
}

export type InviteSkipReason = "NO_EMAIL" | "ALREADY_ACTIVE"

export const INVITE_SKIP_LABELS: Record<InviteSkipReason, string> = {
  NO_EMAIL: "senza email",
  ALREADY_ACTIVE: "ha già l'accesso",
}

export type InvitePlan = {
  recipients: { id: string; name: string; reinvite: boolean }[]
  skipped: { id: string; name: string; reason: InviteSkipReason }[]
}

export function planAccessInvites(selected: InviteCandidate[]): InvitePlan {
  const plan: InvitePlan = { recipients: [], skipped: [] }
  for (const candidate of selected) {
    if (isInvitable(candidate.status)) {
      plan.recipients.push({
        id: candidate.id,
        name: candidate.name,
        // Già invitato: riceve un link nuovo e quello vecchio smette di
        // funzionare
        reinvite: candidate.status.kind === "INVITED",
      })
    } else {
      plan.skipped.push({
        id: candidate.id,
        name: candidate.name,
        reason: candidate.status.kind === "ACTIVE" ? "ALREADY_ACTIVE" : "NO_EMAIL",
      })
    }
  }
  return plan
}

// "1 senza email, 1 ha già l'accesso"
export function skippedSummary(skipped: InvitePlan["skipped"]): string {
  const order: InviteSkipReason[] = ["NO_EMAIL", "ALREADY_ACTIVE"]
  return order
    .map((reason) => ({
      reason,
      count: skipped.filter((s) => s.reason === reason).length,
    }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${INVITE_SKIP_LABELS[entry.reason]}`)
    .join(", ")
}
