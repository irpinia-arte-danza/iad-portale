import { UserRole } from "@prisma/client"

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "/admin/dashboard"
    case UserRole.TEACHER:
      return "/teacher/dashboard"
    case UserRole.PARENT:
      return "/parent/dashboard"
    default: {
      const _exhaustive: never = role
      throw new Error(`Unhandled UserRole: ${_exhaustive}`)
    }
  }
}

// Prefisso dell'area di un ruolo: allow-list per i redirect "next".
export function getRoleAreaPrefix(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "/admin"
    case UserRole.TEACHER:
      return "/teacher"
    case UserRole.PARENT:
      return "/parent"
    default: {
      const _exhaustive: never = role
      throw new Error(`Unhandled UserRole: ${_exhaustive}`)
    }
  }
}
