import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { CestinoClient } from "./_components/cestino-client"
import {
  getCestinoCounts,
  getDeletedAffiliationCards,
  getDeletedAthletes,
  getDeletedEnrollments,
  getDeletedCostumes,
  getDeletedCourses,
  getDeletedExpenses,
  getDeletedMedicalCertificates,
  getDeletedParents,
  getDeletedShowcases,
  getDeletedTeachers,
} from "./queries"

export default async function CestinoPage() {
  const [
    counts,
    athletes,
    parents,
    teachers,
    courses,
    expenses,
    certs,
    cards,
    enrollments,
    showcases,
    costumes,
  ] = await Promise.all([
    getCestinoCounts(),
    getDeletedAthletes(),
    getDeletedParents(),
    getDeletedTeachers(),
    getDeletedCourses(),
    getDeletedExpenses(),
    getDeletedMedicalCertificates(),
    getDeletedAffiliationCards(),
    getDeletedEnrollments(),
    getDeletedShowcases(),
    getDeletedCostumes(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Cestino" }]}
        title="Cestino"
        description="Quello che elimini finisce qui e si può ripristinare. Niente viene cancellato per sempre."
      />
      <ResourceContent>
        <CestinoClient
          counts={counts}
          athletes={athletes}
          parents={parents}
          teachers={teachers}
          courses={courses}
          expenses={expenses}
          certs={certs}
          cards={cards}
          enrollments={enrollments}
          showcases={showcases}
          costumes={costumes}
        />
      </ResourceContent>
    </>
  )
}
