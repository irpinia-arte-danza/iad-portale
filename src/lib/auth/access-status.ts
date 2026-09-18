import "server-only"

import { EmailStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import {
  ACCESS_MILESTONES,
  normalizeEmail,
  type AccessProfileKind,
  type AccessStatus,
} from "./access-status-types"
import { getAuthUsersByIds } from "./auth-users"

type ProfileRef = {
  id: string
  email: string | null
  userId: string | null
}

// Stato dell'accesso ricavato da dati già esistenti, senza campi duplicati:
// - ATTIVO: account Supabase collegato con password impostata
// - SENZA EMAIL: profilo senza indirizzo
// - INVITATO: email di accesso (non fallita) inviata all'indirizzo attuale
// - MAI INVITATO: tutto il resto (inclusi collegamenti a utenti orfani)
export async function getAccessStatuses(
  kind: AccessProfileKind,
  profiles: ProfileRef[],
): Promise<Record<string, AccessStatus>> {
  if (profiles.length === 0) return {}

  const authUsers = await getAuthUsersByIds(
    profiles.flatMap((p) => (p.userId ? [p.userId] : [])),
  )

  const emails = [
    ...new Set(
      profiles
        .map((p) => normalizeEmail(p.email))
        .filter((e): e is string => e !== null),
    ),
  ]

  const logs =
    emails.length === 0
      ? []
      : await prisma.emailLog.findMany({
          where: {
            milestoneKey: { in: [...ACCESS_MILESTONES] },
            status: { not: EmailStatus.FAILED },
            recipientEmail: { in: emails },
            // Genitori e allieve si distinguono per il profilo collegato al
            // log; per gli insegnanti non c'è collegamento, e basta l'email
            ...(kind === "PARENT"
              ? { parentId: { in: profiles.map((p) => p.id) } }
              : kind === "ATHLETE"
                ? { athleteId: { in: profiles.map((p) => p.id) } }
                : { parentId: null, athleteId: null }),
          },
          select: {
            recipientEmail: true,
            parentId: true,
            athleteId: true,
            status: true,
            sentAt: true,
          },
          orderBy: { sentAt: "desc" },
        })

  const latestByKey = new Map<string, (typeof logs)[number]>()
  for (const log of logs) {
    const key =
      kind === "PARENT"
        ? `${log.parentId}|${log.recipientEmail}`
        : kind === "ATHLETE"
          ? `${log.athleteId}|${log.recipientEmail}`
          : log.recipientEmail
    if (!latestByKey.has(key)) latestByKey.set(key, log)
  }

  const result: Record<string, AccessStatus> = {}
  for (const profile of profiles) {
    const authUser = profile.userId ? authUsers.get(profile.userId) : undefined
    if (authUser?.hasPassword) {
      result[profile.id] = {
        kind: "ACTIVE",
        lastSignInAt: authUser.lastSignInAt,
      }
      continue
    }

    const email = normalizeEmail(profile.email)
    if (!email) {
      result[profile.id] = { kind: "NO_EMAIL" }
      continue
    }

    const log = latestByKey.get(
      kind === "TEACHER" ? email : `${profile.id}|${email}`,
    )
    result[profile.id] = log
      ? {
          kind: "INVITED",
          invitedAt: log.sentAt,
          deliveryProblem:
            log.status === EmailStatus.BOUNCED ||
            log.status === EmailStatus.COMPLAINED,
        }
      : { kind: "NEVER_INVITED" }
  }

  return result
}

export async function getAccessStatus(
  kind: AccessProfileKind,
  profile: ProfileRef,
): Promise<AccessStatus> {
  const statuses = await getAccessStatuses(kind, [profile])
  return statuses[profile.id] ?? { kind: "NO_EMAIL" }
}
