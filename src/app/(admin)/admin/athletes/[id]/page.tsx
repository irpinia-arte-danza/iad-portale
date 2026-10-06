import { notFound } from "next/navigation"

import { athleteStatusStrip } from "@/lib/athletes/athlete-status"
import { athleteSetupChecklist } from "@/lib/athletes/setup-checklist"
import { getAccessStatus } from "@/lib/auth/access-status"
import { athleteAccessEligibility } from "@/lib/auth/athlete-access"
import { prisma } from "@/lib/prisma"
import { computeAge } from "@/lib/utils/date-helpers"
import { formatDateShort } from "@/lib/utils/format"

import { EmailLogTable } from "../../_components/email-log/table"
import { getAthleteEmailLog } from "../../_components/email-log/queries"
import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import {
  listAthletesWithRelations,
  listOpenSchedulesByAthlete,
} from "../../payments/queries"
import { AthleteAnagraficaDisplay } from "../_components/athlete-anagrafica-display"
import { AthleteHeaderActions } from "../_components/athlete-header-actions"
import { EnrollmentsSection } from "../_components/enrollments-section"
import { GuardianListSection } from "../_components/guardian-list-section"
import { ScheduleSettleProvider } from "../_components/schedule-settle-provider"
import { SchedulesSection } from "../_components/schedules-section"
import {
  getAthleteById,
  getAthleteForPDF,
  getAthleteLastPaymentMethod,
} from "../queries"
import { AthleteAccessSection } from "./_components/athlete-access-section"
import { AthletePayerRow } from "./_components/athlete-payer-row"
import { AthleteStatusStrip } from "./_components/athlete-status-strip"
import { EndasCardSection } from "./_components/endas-card-section"
import { MedicalCertSection } from "./_components/medical-cert-section"
import {
  CARD_SECTION_ID,
  SetupChecklistCard,
} from "./_components/setup-checklist-card"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteDetailPage({ params }: PageProps) {
  const resolvedParams = await params

  const [
    athlete,
    athleteForPDF,
    activeCourses,
    currentAcademicYear,
    athletesForPaymentForm,
    emailLog,
    openSchedulesByAthlete,
    lastMethod,
  ] = await Promise.all([
    getAthleteById(resolvedParams.id),
    getAthleteForPDF(resolvedParams.id),
    prisma.course.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        monthlyFeeCents: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: {
        id: true,
        label: true,
        startDate: true,
        monthlyRenewalDay: true,
        associationFeeCents: true,
      },
    }),
    listAthletesWithRelations(),
    getAthleteEmailLog(resolvedParams.id),
    listOpenSchedulesByAthlete(resolvedParams.id),
    getAthleteLastPaymentMethod(resolvedParams.id),
  ])

  if (!athlete) {
    notFound()
  }

  const fullName = `${athlete.lastName} ${athlete.firstName}`

  // Stessa regola che applica il motore dell'invito: la sezione compare solo
  // dove l'accesso si può davvero dare
  const canHaveOwnAccess = athleteAccessEligibility({
    dateOfBirth: athlete.dateOfBirth,
    linkedParents: athlete.parentRelations.length,
  }).ok
  // Cosa manca perché la scheda sia a posto: genitore, email, corso,
  // certificato, tessera. Il passo del genitore assorbe l'avviso che prima
  // stava qui da solo.
  const setupSteps = athleteSetupChecklist(
    {
      status: athlete.status,
      dateOfBirth: athlete.dateOfBirth,
      email: athlete.email,
      linkedParents: athlete.parentRelations.length,
      enrollments: athlete.enrollments.map((e) => ({
        academicYearId: e.academicYearId,
        withdrawalDate: e.withdrawalDate,
        deletedAt: e.deletedAt,
      })),
      certificates: athlete.medicalCertificates.map((c) => ({
        expiryDate: c.expiryDate,
        createdAt: c.createdAt,
      })),
      cards: athlete.affiliations.map((c) => ({
        entity: c.entity,
        cardYear: c.cardYear,
        expiryDate: c.expiryDate,
        createdAt: c.createdAt,
      })),
    },
    { currentAcademicYear },
  )

  // Sottotitolo: quanti anni, che corso fa, da quando è iscritta quest'anno
  const currentEnrollments = athlete.enrollments.filter(
    (e) => e.academicYearId === currentAcademicYear?.id && !e.withdrawalDate,
  )
  const age = computeAge(athlete.dateOfBirth)
  const subtitle = [
    age !== null ? `${age} anni` : null,
    currentEnrollments.map((e) => e.course.name).join(" · ") || null,
    currentEnrollments[0]
      ? `iscritta il ${formatDateShort(currentEnrollments[0].enrollmentDate)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  // Tutte le rate dell'allieva: mensili dei corsi e contributo di iscrizione
  const allSchedules = [
    ...athlete.paymentSchedules,
    ...athlete.enrollments.flatMap((e) => e.paymentSchedules),
  ]
  const status = athleteStatusStrip({
    certificates: athlete.medicalCertificates,
    cards: athlete.affiliations,
    schedules: allSchedules,
    currentAcademicYear,
  })

  // Chi paga: il pagante, poi il contatto, poi il primo collegato. Senza
  // genitori, una maggiorenne paga per sé (vedi #35).
  const payerRelation =
    athlete.parentRelations.find((r) => r.isPrimaryPayer) ??
    athlete.parentRelations.find((r) => r.isPrimaryContact) ??
    athlete.parentRelations[0] ??
    null
  const isAdult = age !== null && age >= 18
  const payer = payerRelation
    ? {
        name: `${payerRelation.parent.lastName} ${payerRelation.parent.firstName}`,
        phone: payerRelation.parent.phone,
        email: payerRelation.parent.email,
        isAthlete: false,
        parentId: payerRelation.parent.id,
      }
    : isAdult
      ? {
          name: fullName,
          phone: athlete.phone,
          email: athlete.email,
          isAthlete: true,
          parentId: null,
        }
      : null

  const openSchedules = openSchedulesByAthlete[athlete.id] ?? []

  const accessStatus = canHaveOwnAccess
    ? await getAccessStatus("ATHLETE", {
        id: athlete.id,
        email: athlete.email,
        userId: athlete.userId,
      })
    : null

  return (
    // Il dialog di incasso sta qui, fuori da tutto: lo aprono l'intestazione
    // e le righe delle rate, e non deve smontarsi quando la pagina cambia
    <ScheduleSettleProvider
      athletesForPaymentForm={athletesForPaymentForm}
      openSchedulesByAthlete={openSchedulesByAthlete}
    >
      <ResourceHeader
        breadcrumbs={[
          { label: "Allieve", href: "/admin/athletes" },
          { label: fullName },
        ]}
        title={fullName}
        description={subtitle || undefined}
        action={
          <AthleteHeaderActions
            athlete={athlete}
            linkedParents={athlete.parentRelations.length}
            pdf={
              athleteForPDF
                ? { data: athleteForPDF.athlete, brand: athleteForPDF.brand }
                : null
            }
            openSchedules={openSchedules.map((s) => ({
              id: s.id,
              feeType: s.feeType,
              courseEnrollmentId: null,
              courseName: s.description,
              dueDate: s.dueDate,
              amountCents: s.amountCents,
            }))}
            lastMethod={lastMethod}
          />
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <AthleteStatusStrip
            athleteId={athlete.id}
            certificate={status.certificate}
            contributions={status.contributions}
            card={status.card}
          />
          <AthletePayerRow athleteId={athlete.id} payer={payer} />
          <SetupChecklistCard
            steps={setupSteps}
            athlete={athlete}
            linkedParents={athlete.parentRelations.length}
            course={{
              activeCourses,
              currentAcademicYear,
              hasAssociationFee: athlete.paymentSchedules.some(
                (s) => s.academicYearId === currentAcademicYear?.id,
              ),
              enrolledCourseIds: athlete.enrollments
                .filter((e) => e.academicYearId === currentAcademicYear?.id)
                .map((e) => e.courseId),
            }}
          />
          <AthleteAnagraficaDisplay athlete={athlete} />
          <MedicalCertSection
            athleteId={athlete.id}
            certificates={athlete.medicalCertificates}
          />
          <div id={CARD_SECTION_ID} className="scroll-mt-20">
            <EndasCardSection
              athleteId={athlete.id}
              entity="ENDAS"
              cards={athlete.affiliations.filter((c) => c.entity === "ENDAS")}
            />
          </div>
          <GuardianListSection
            athleteId={athlete.id}
            parentRelations={athlete.parentRelations}
            dateOfBirth={athlete.dateOfBirth}
            hasOwnAccess={athlete.userId !== null}
          />
          {accessStatus ? (
            <AthleteAccessSection
              athleteId={athlete.id}
              status={accessStatus}
            />
          ) : null}
          <EnrollmentsSection
            athleteId={athlete.id}
            athleteFirstName={athlete.firstName}
            enrollments={athlete.enrollments}
            activeCourses={activeCourses}
            currentAcademicYear={currentAcademicYear}
            hasAssociationFee={athlete.paymentSchedules.some(
              (s) => s.academicYearId === currentAcademicYear?.id,
            )}
          />
          <SchedulesSection
            enrollments={athlete.enrollments}
            associationSchedules={athlete.paymentSchedules}
          />
          <EmailLogTable
            title="Storico email"
            description="Tutte le email inviate relative a questa allieva, in ordine cronologico."
            logs={emailLog}
          />
        </div>
      </ResourceContent>
    </ScheduleSettleProvider>
  )
}
