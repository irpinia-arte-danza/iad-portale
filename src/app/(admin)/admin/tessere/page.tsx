import { AffiliationEntity } from "@prisma/client"

import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { seasonLabel } from "@/lib/affiliations/card-status"
import { requireAdmin } from "@/lib/auth/require-admin"
import { formatDateShort } from "@/lib/utils/format"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { CardImport } from "./_components/card-import"
import { CardsOverview } from "./_components/cards-overview"
import { TesseramentoQueue } from "./_components/tesseramento-queue"
import {
  getCardManagerSummary,
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
  const [rows, queue, brand, cardManager] = await Promise.all([
    getCardsOverview(ENTITY),
    getTesseramentoQueue(ENTITY, seasonYear),
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: { logoUrl: true, asdName: true },
    }),
    getCardManagerSummary(),
  ])

  // Chi carica le tessere oltre a Giuseppina: il referente, se c'è
  const cardManagerName = cardManager
    ? [cardManager.firstName, cardManager.lastName].filter(Boolean).join(" ") || cardManager.email
    : null

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: `Tessere ${ENTITY}` }]}
        title={`Tessere ${ENTITY}`}
        // La stagione, non "gennaio–dicembre": la tessera non segue l'anno
        // solare, e quanto vale lo dice la data stampata su ciascuna
        description={`Tessere della stagione ${seasonLabel(seasonYear)} · la validità è quella stampata su ogni tessera`}
        notice={
          <p className="text-sm text-muted-foreground">
            {cardManager ? (
              <>
                Referente: <span className="font-medium text-foreground">{cardManagerName}</span>
                {" · "}
                {cardManager.access === "ACTIVE"
                  ? cardManager.lastSignInAt
                    ? `ultimo accesso il ${formatDateShort(cardManager.lastSignInAt)}`
                    : "accesso attivo"
                  : "invitato, non ancora entrato"}
              </>
            ) : (
              <>
                Nessun referente con accesso proprio.{" "}
                <Link
                  href="/admin/settings?tab=admin"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  Invitalo da Impostazioni › Admin
                </Link>
              </>
            )}
          </p>
        }
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
