import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"

// Route handler che fa logout e mostra la pagina "accesso non attivo".
// Usato al posto di redirect("/login") quando un utente autenticato non ha
// un profilo attivo: evita il loop login → dashboard → login.
export const NO_ACCESS_ROUTE = "/auth/no-access"
export const NO_ACCESS_PAGE = "/accesso-non-attivo"

export type AccountState =
  | {
      state: "ok"
      userId: string
      role: UserRole
      parentId: string | null
      teacherId: string | null
    }
  | {
      state: "blocked"
      userId: string
      reason: "no-user" | "inactive" | "no-profile"
    }

// Un account è utilizzabile solo se: utente Prisma esiste, è attivo e (per
// PARENT/TEACHER) ha un profilo non nel cestino.
export async function resolveAccountState(userId: string): Promise<AccountState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
      deletedAt: true,
      parentProfile: { select: { id: true, deletedAt: true } },
      teacherProfile: { select: { id: true, deletedAt: true } },
    },
  })

  if (!user) return { state: "blocked", userId, reason: "no-user" }
  if (!user.isActive || user.deletedAt) {
    return { state: "blocked", userId, reason: "inactive" }
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return { state: "ok", userId, role: user.role, parentId: null, teacherId: null }
    case UserRole.PARENT:
      if (user.parentProfile && !user.parentProfile.deletedAt) {
        return {
          state: "ok",
          userId,
          role: user.role,
          parentId: user.parentProfile.id,
          teacherId: null,
        }
      }
      return { state: "blocked", userId, reason: "no-profile" }
    case UserRole.TEACHER:
      if (user.teacherProfile && !user.teacherProfile.deletedAt) {
        return {
          state: "ok",
          userId,
          role: user.role,
          parentId: null,
          teacherId: user.teacherProfile.id,
        }
      }
      return { state: "blocked", userId, reason: "no-profile" }
    default: {
      const _exhaustive: never = user.role
      throw new Error(`Unhandled UserRole: ${_exhaustive}`)
    }
  }
}
