import { AffiliationEntity } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { CardImport } from "./_components/card-import"
import { CardsOverview } from "./_components/cards-overview"
import { TesseramentoQueue } from "./_components/tesseramento-queue"
import {
  getCardsOverview,
  getCurrentSeasonYear,
  getTesseramentoQueue,
} from "./queries"

// Per ora l'unico ente di cui sappiamo leggere il PDF. CSEN si aggiunge
// scrivendo il suo parser: da qui in giù non cambia niente.
const ENTITY = AffiliationEntity.ENDAS

export default async function TesserePage() {
  await requireAdmin()

  const seasonYear = await getCurrentSeasonYear()
  const [rows, queue, brand] = await Promise.all([
    getCardsOverview(ENTITY),
    getTesseramentoQueue(ENTITY, seasonYear),
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: { logoUrl: true, asdName: true },
    }),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: `Tessere ${ENTITY}` }]}
        title={`Tessere ${ENTITY}`}
        description="La tessera dell'ente è anche la copertura assicurativa dell'allieva. Qui si prepara l'elenco per il referente e si caricano i PDF che torna indietro."
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <TesseramentoQueue
            rows={queue}
            entity={ENTITY}
            seasonYear={seasonYear}
            asdName={brand?.asdName ?? null}
            logoUrl={brand?.logoUrl ?? null}
          />
          <CardImport entity={ENTITY} />
          <CardsOverview rows={rows} entity={ENTITY} />
        </div>
      </ResourceContent>
    </>
  )
}
