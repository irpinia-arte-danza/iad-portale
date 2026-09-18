import { notFound } from "next/navigation"

import { getAccessStatus } from "@/lib/auth/access-status"
import { athleteAccessEligibility } from "@/lib/auth/athlete-access"
import { prisma } from "@/lib/prisma"

import { EmailLogTable } from "../../_components/email-log/table"
import { getAthleteEmailLog } from "../../_components/email-log/queries"
import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import {
  listAthletesWithRelations,
  listOpenSchedulesByAthlete,
} from "../../payments/queries"
import { AthleteAnagraficaDisplay } from "../_components/athlete-anagrafica-display"
import { AthleteDetailHeader } from "../_components/athlete-detail-header"
import { EnrollmentsSection } from "../_components/enrollments-section"
import { GuardianListSection } from "../_components/guardian-list-section"
import { SchedulesSection } from "../_components/schedules-section"
import { getAthleteById, getAthleteForPDF } from "../queries"
import { AthleteAccessSection } from "./_components/athlete-access-section"
import { AthletePDFButton } from "./_components/athlete-pdf-button"
import { MedicalCertSection } from "./_components/medical-cert-section"

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
  const accessStatus = canHaveOwnAccess
    ? await getAccessStatus("ATHLETE", {
        id: athlete.id,
        email: athlete.email,
        userId: athlete.userId,
      })
    : null

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Allieve", href: "/admin/athletes" },
          { label: fullName },
        ]}
        title={fullName}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {athleteForPDF ? (
              <AthletePDFButton
                data={athleteForPDF.athlete}
                brand={athleteForPDF.brand}
              />
            ) : null}
            <AthleteDetailHeader athlete={athlete} />
          </div>
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <AthleteAnagraficaDisplay athlete={athlete} />
          <MedicalCertSection
            athleteId={athlete.id}
            certificates={athlete.medicalCertificates}
          />
          <GuardianListSection
            athleteId={athlete.id}
            parentRelations={athlete.parentRelations}
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
            athleteId={athlete.id}
            athleteFirstName={athlete.firstName}
            athleteLastName={athlete.lastName}
            enrollments={athlete.enrollments}
            associationSchedules={athlete.paymentSchedules}
            athletesForPaymentForm={athletesForPaymentForm}
            openSchedulesByAthlete={openSchedulesByAthlete}
          />
          <EmailLogTable
            title="Storico email"
            description="Tutte le email inviate relative a questa allieva, in ordine cronologico."
            logs={emailLog}
          />
        </div>
      </ResourceContent>
    </>
  )
}
