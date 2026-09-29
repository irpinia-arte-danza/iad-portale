import type { Prisma } from "@prisma/client"

// PaymentSchedule è polimorfico, ogni scadenza ha un solo collegamento:
//   • courseEnrollmentId → quota mensile di un corso
//   • stageEnrollmentId / showcaseParticipationId / costumeAssignmentId →
//     stage, saggio, costume
//   • athleteId → quota associativa annuale (una per allieva per anno)
// activeScheduleFilter (default) tiene solo scadenze di tipo corso con
// allieva/corso attivi: lo usano i solleciti, che riguardano le mensili.
//
// La regola sta sulla RATA, non sull'iscrizione. Prima era
// `courseEnrollment: { withdrawalDate: null }`, cioè di un'iscrizione ritirata
// sparivano tutte le rate — anche i mesi già frequentati e non pagati, che
// diventavano impossibili da vedere e da sollecitare. Ora il ritiro annulla da
// solo le rate dei mesi successivi (deletedAt) e qui basta chiedere che la
// rata non sia nel Cestino: i mesi frequentati restano dovuti e visibili.

const scheduleNotDeleted = { deletedAt: null } as const

export const activeScheduleFilter = {
  deletedAt: null,
  courseEnrollment: {
    deletedAt: null,
    athlete: { deletedAt: null },
    course: { deletedAt: null },
  },
} as const satisfies Prisma.PaymentScheduleWhereInput

export function withActiveScheduleFilter(
  where: Prisma.PaymentScheduleWhereInput,
): Prisma.PaymentScheduleWhereInput {
  const existingEnrollmentFilter = where.courseEnrollment as
    | Prisma.CourseEnrollmentWhereInput
    | undefined

  return {
    ...where,
    deletedAt: null,
    courseEnrollment: existingEnrollmentFilter
      ? {
          AND: [activeScheduleFilter.courseEnrollment, existingEnrollmentFilter],
        }
      : activeScheduleFilter.courseEnrollment,
  }
}

// Quota associativa di un'allieva non nel Cestino. Resta visibile anche se
// l'allieva si ritira dai corsi: è dovuta dall'iscrizione e non si rimborsa.
const activeAssociationFeeFilter = {
  feeType: "ASSOCIATION",
  athlete: { deletedAt: null },
} as const satisfies Prisma.PaymentScheduleWhereInput

// Scadenze legate all'iscrizione ai corsi: mensili dei corsi attivi e quota
// associativa annuale. Per /admin/scadenze e i contatori della dashboard.
// Composizione in AND per lo stesso motivo spiegato sotto.
export function withActiveCourseOrAssociationScheduleFilter(
  where: Prisma.PaymentScheduleWhereInput,
): Prisma.PaymentScheduleWhereInput {
  return {
    AND: [
      where,
      scheduleNotDeleted,
      {
        OR: [
          { courseEnrollment: activeScheduleFilter.courseEnrollment },
          activeAssociationFeeFilter,
        ],
      },
    ],
  }
}

// Scadenza valida per gli scopi del parent portal:
// corso attivo OPPURE quota associativa OPPURE stage attivo OPPURE saggio
// attivo OPPURE costume (non soft-deleted) con allieva attiva.
//
// Composizione in AND, mai `{ ...where, OR }`: se il chiamante filtra a sua
// volta con OR (es. il filtro per genitore del portale), lo spread lo
// sovrascriverebbe in silenzio e la query restituirebbe le scadenze di
// tutte le famiglie. Bug reale introdotto in Sprint 6.A, vedi test
// "genitore senza figlie collegate".
export function withActiveCourseOrStageScheduleFilter(
  where: Prisma.PaymentScheduleWhereInput,
): Prisma.PaymentScheduleWhereInput {
  return {
    AND: [
      where,
      scheduleNotDeleted,
      {
        OR: [
          // Derivata, non ricopiata: due definizioni della stessa condizione
          // divergono senza che nessuno se ne accorga
          { courseEnrollment: activeScheduleFilter.courseEnrollment },
          activeAssociationFeeFilter,
          {
            stageEnrollment: {
              athlete: { deletedAt: null },
              stage: { deletedAt: null },
            },
          },
          {
            showcaseParticipation: {
              athlete: { deletedAt: null },
              showcase: { deletedAt: null },
            },
          },
          {
            costumeAssignment: {
              costume: { deletedAt: null, showcase: { deletedAt: null } },
              participation: { athlete: { deletedAt: null } },
            },
          },
        ],
      },
    ],
  }
}
