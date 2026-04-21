import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { listAthletesWithRelations } from "../../payments/queries"
import { AthleteAnagraficaDisplay } from "../_components/athlete-anagrafica-display"
import { AthleteDetailHeader } from "../_components/athlete-detail-header"
import { EnrollmentsSection } from "../_components/enrollments-section"
import { GuardianListSection } from "../_components/guardian-list-section"
import { SchedulesSection } from "../_components/schedules-section"
import { getAthleteById } from "../queries"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteDetailPage({ params }: PageProps) {
  const resolvedParams = await params

  const [athlete, activeCourses, currentAcademicYear, athletesForPaymentForm] =
    await Promise.all([
      getAthleteById(resolvedParams.id),
      prisma.course.findMany({
        where: { isActive: true },
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
        action={<AthleteDetailHeader athlete={athlete} />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <AthleteAnagraficaDisplay athlete={athlete} />
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
        </div>
      </ResourceContent>
    </>
  )
}
