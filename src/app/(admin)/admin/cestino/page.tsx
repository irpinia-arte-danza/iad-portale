import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { CestinoClient } from "./_components/cestino-client"
import {
  getCestinoCounts,
  getDeletedAthletes,
  getDeletedCourses,
  getDeletedExpenses,
  getDeletedMedicalCertificates,
  getDeletedParents,
  getDeletedTeachers,
} from "./queries"

export default async function CestinoPage() {
  const [counts, athletes, parents, teachers, courses, expenses, certs] =
    await Promise.all([
      getCestinoCounts(),
      getDeletedAthletes(),
      getDeletedParents(),
      getDeletedTeachers(),
      getDeletedCourses(),
      getDeletedExpenses(),
      getDeletedMedicalCertificates(),
    ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Cestino" }]}
        title="Cestino"
        description="Elementi eliminati ripristinabili. La cancellazione definitiva (GDPR) sarà disponibile in fase successiva."
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
        />
      </ResourceContent>
    </>
  )
}
