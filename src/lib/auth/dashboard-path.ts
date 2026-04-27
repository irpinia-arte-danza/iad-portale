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
