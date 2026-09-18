// Tipi e costanti condivisi client/server per lo stato dell'accesso al
// portale di genitori, insegnanti e allieve maggiorenni che accedono per sé.
// Nessun import server-only qui.

export type AccessProfileKind = "PARENT" | "TEACHER" | "ATHLETE"

// milestoneKey degli EmailLog: rendono leggibile lo storico e servono a
// ricavare lo stato INVITATO senza duplicare stato su Parent/Teacher.
export const ACCESS_INVITE_MILESTONE = "ACCESS_INVITE"
export const ACCESS_REINVITE_MILESTONE = "ACCESS_REINVITE"
export const PASSWORD_RESET_MILESTONE = "PASSWORD_RESET"

export const ACCESS_MILESTONES = [
  ACCESS_INVITE_MILESTONE,
  ACCESS_REINVITE_MILESTONE,
] as const

// Email che contengono un link personale di accesso: il link non viene
// salvato nel log e l'email non può essere "reinviata" dal log.
export function isPersonalLinkMilestone(key: string | null): boolean {
  return (
    key === ACCESS_INVITE_MILESTONE ||
    key === ACCESS_REINVITE_MILESTONE ||
    key === PASSWORD_RESET_MILESTONE
  )
}

export type AccessStatus =
  | { kind: "NO_EMAIL" }
  | { kind: "NEVER_INVITED" }
  | { kind: "INVITED"; invitedAt: Date; deliveryProblem: boolean }
  | { kind: "ACTIVE"; lastSignInAt: Date | null }

export function isInvitable(status: AccessStatus): boolean {
  return status.kind === "NEVER_INVITED" || status.kind === "INVITED"
}

export type AccessInviteErrorCode =
  | "NOT_FOUND"
  | "NO_EMAIL"
  // Profilo che non può avere un accesso proprio (es. allieva minorenne, o
  // con un genitore collegato: l'accesso è del genitore)
  | "NOT_ELIGIBLE"
  | "ALREADY_ACTIVE"
  | "EMAIL_CONFLICT"
  | "RATE_LIMIT"
  | "LINK_FAILED"
  | "SEND_FAILED"
  | "CONFIG"

export type AccessInviteResult =
  | { ok: true; reinvite: boolean }
  | { ok: false; code: AccessInviteErrorCode; error: string }

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}
