import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"

import { EmailLogTable } from "../../_components/email-log/table"
import { getAthleteEmailLog } from "../../_components/email-log/queries"
import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { listAthletesWithRelations } from "../../payments/queries"
import { AthleteAnagraficaDisplay } from "../_components/athlete-anagrafica-display"
import { AthleteDetailHeader } from "../_components/athlete-detail-header"
import { EnrollmentsSection } from "../_components/enrollments-section"
import { GuardianListSection } from "../_components/guardian-list-section"
import { SchedulesSection } from "../_components/schedules-section"
import { getAthleteById, getAthleteForPDF } from "../queries"
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
      select: { id: true, label: true },
    }),
    listAthletesWithRelations(),
    getAthleteEmailLog(resolvedParams.id),
  ])

  if (!athlete) {
    notFound()
  }

  const fullName = `${athlete.lastName} ${athlete.firstName}`

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
          <EnrollmentsSection
            athleteId={athlete.id}
            athleteFirstName={athlete.firstName}
            enrollments={athlete.enrollments}
            activeCourses={activeCourses}
            currentAcademicYearLabel={currentAcademicYear?.label ?? null}
          />
          <SchedulesSection
            athleteId={athlete.id}
            athleteFirstName={athlete.firstName}
            athleteLastName={athlete.lastName}
            enrollments={athlete.enrollments}
            athletesForPaymentForm={athletesForPaymentForm}
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
