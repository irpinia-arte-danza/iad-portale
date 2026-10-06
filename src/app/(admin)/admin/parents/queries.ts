import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listNeverInvitedIds } from "@/lib/auth/access-status"

type ListFilters = {
  search?: string
  limit?: number
  offset?: number
}

// ~40 famiglie con entrambi i genitori superano 50 righe: la lista deve
// mostrarli tutti per selezionarli nell'invio multiplo degli accessi.
const DEFAULT_LIMIT = 200

// I filtri dell'elenco vivono in lib/parents/list-filters (funzioni pure,
// condivise con i chip e con il riquadro della dashboard)
export {
  PARENTS_WITHOUT_ACCESS_FILTER,
  parseParentsFilter,
} from "@/lib/parents/list-filters"

export async function listParents(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, limit = DEFAULT_LIMIT, offset = 0 } = filters

  const where: Prisma.ParentWhereInput = {
    deletedAt: null,
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, totalCount] = await Promise.all([
    prisma.parent.findMany({
      where,
      include: {
        _count: {
          select: {
            athleteRelations: {
              where: { athlete: { deletedAt: null } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.parent.count({ where }),
  ])

  return { items, totalCount }
}

export async function getParentById(id: string) {
  await requireAdmin()

  return prisma.parent.findUnique({
    where: { id, deletedAt: null },
    include: {
      athleteRelations: {
        where: { athlete: { deletedAt: null } },
        include: { athlete: true },
      },
    },
  })
}

/**
 * Quanti genitori non hanno mai ricevuto l'accesso.
 *
 * Conta sulla stessa base dell'elenco (genitori non nel Cestino) e con la
 * stessa funzione che disegna la colonna "Accesso", così il numero del
 * riquadro in dashboard è il numero di righe che si vedono aprendo
 * `/admin/parents?filtro=senza-accesso`.
 */
export async function countParentsWithoutAccess(): Promise<number> {
  await requireAdmin()

  const parents = await prisma.parent.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, userId: true },
  })

  const neverInvited = await listNeverInvitedIds("PARENT", parents)
  return neverInvited.length
}
