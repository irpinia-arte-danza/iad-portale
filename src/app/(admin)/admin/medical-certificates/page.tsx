import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { MedicalCertsClient } from "./_components/medical-certs-client"
import { getCertificatesOverview } from "./queries"

export default async function MedicalCertificatesPage() {
  const rows = await getCertificatesOverview()

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Certificati medici" }]}
        title="Certificati medici"
        description="Stato dei certificati per tutte le allieve attive. Invia promemoria al genitore per certificati in scadenza o scaduti."
      />
      <ResourceContent>
        <MedicalCertsClient rows={rows} />
      </ResourceContent>
    </>
  )
}
