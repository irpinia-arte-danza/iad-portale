import {
  certFilterCounts,
  defaultCertFilter,
  matchesCertFilter,
  parseCertListFilter,
} from "@/lib/medical-certificates/list-filters"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"
import { listCoursesForFilter } from "../scadenze/queries"

import { MedicalCertsClient } from "./_components/medical-certs-client"
import { getCertificatesOverview } from "./queries"

interface PageProps {
  searchParams: Promise<{ status?: string; corso?: string }>
}

export default async function MedicalCertificatesPage({
  searchParams,
}: PageProps) {
  const resolved = await searchParams
  const courseId = resolved.corso?.trim() || undefined

  const [all, courses] = await Promise.all([
    getCertificatesOverview(),
    listCoursesForFilter(),
  ])

  // Il corso restringe righe e chip insieme: il numero sul chip è sempre
  // quello delle righe che apre. Senza corso i conteggi sono quelli dei
  // riquadri in dashboard e del badge del menu (stessa popolazione, stessa
  // classifyCert).
  const inScope = courseId
    ? all.filter((row) => row.courses.some((c) => c.id === courseId))
    : all
  const counts = certFilterCounts(inScope.map((row) => row.status))

  // Senza ?status= si apre sul primo chip non vuoto: sul lavoro da fare
  const filter = parseCertListFilter(resolved.status) ?? defaultCertFilter(counts)
  const rows = inScope.filter((row) => matchesCertFilter(row.status, filter))

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Certificati medici" }]}
        title="Certificati medici"
        description="Senza certificato valido non si fa lezione: da qui lo carichi o lo chiedi alla famiglia."
      />
      <ResourceContent>
        <MedicalCertsClient
          rows={rows}
          filter={filter}
          counts={counts}
          courseId={courseId}
          courses={courses}
        />
      </ResourceContent>
    </>
  )
}
