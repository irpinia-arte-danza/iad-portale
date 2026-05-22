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
    showcases,
  ] = await Promise.all([
    getCestinoCounts(),
    getDeletedAthletes(),
    getDeletedParents(),
    getDeletedTeachers(),
    getDeletedCourses(),
    getDeletedExpenses(),
    getDeletedMedicalCertificates(),
    getDeletedShowcases(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Cestino" }]}
        title="Cestino"
        description="Elementi eliminati. Puoi ripristinarli o eliminarli definitivamente. L'eliminazione definitiva è irreversibile e blocca i record con dati fiscali (pagamenti, compensi). I saggi sono solo ripristinabili (preservano lo storico partecipazioni)."
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
          showcases={showcases}
        />
      </ResourceContent>
    </>
  )
}
