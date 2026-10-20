import { CheckCircle2, FileText, ListChecks } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { seasonLabel } from "@/lib/affiliations/card-status"
import {
  CARD_MANAGER_ENTITY,
  getCardManagerCards,
  getCardManagerQueue,
  getCardManagerSeasonYear,
  type CardManagerQueueRow,
} from "@/lib/cards/manager-queries"
import { prisma } from "@/lib/prisma"
import { statusTone, TONE_TEXT } from "@/lib/status/tone"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/utils/format"

import { CardImport } from "@/app/(admin)/admin/tessere/_components/card-import"
import { TesseramentoExportButton } from "@/app/(admin)/admin/tessere/_components/tesseramento-export-button"

export const dynamic = "force-dynamic"

// ─────────────────────────────────────────────────────────────────────────
// La pagina del referente tessere. Tre cose, in ordine di lavoro: chi è da
// tesserare (con i soli dati che l'ente chiede), il caricamento delle
// tessere che arrivano dall'ente, chi è già tesserata quest'anno. Le query
// sono sue (lib/cards/manager-queries.ts): niente contatti, genitori,
// certificati, pagamenti, note.
// ─────────────────────────────────────────────────────────────────────────

function birthPlace(r: CardManagerQueueRow): string {
  if (!r.placeOfBirth) return ""
  return r.provinceOfBirth ? `${r.placeOfBirth} (${r.provinceOfBirth})` : r.placeOfBirth
}

function residence(r: CardManagerQueueRow): string {
  const street = [r.residenceStreet, r.residenceNumber].filter(Boolean).join(" ")
  const city = [r.residenceCap, r.residenceCity].filter(Boolean).join(" ")
  const prov = r.residenceProvince ? `(${r.residenceProvince})` : ""
  return [street, [city, prov].filter(Boolean).join(" ")].filter((p) => p.length > 0).join(", ")
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm [overflow-wrap:anywhere]", mono && "font-mono", !value && TONE_TEXT.fix)}>
        {value || "da completare"}
      </dd>
    </div>
  )
}

export default async function CardManagerPage() {
  const seasonYear = await getCardManagerSeasonYear()
  const [queue, cards, brand] = await Promise.all([
    getCardManagerQueue(seasonYear),
    getCardManagerCards(seasonYear),
    prisma.brandSettings.findUnique({ where: { id: 1 }, select: { asdName: true, logoUrl: true } }),
  ])
  const incomplete = queue.filter((r) => r.missing.length > 0).length
  const entity = CARD_MANAGER_ENTITY

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tesseramento {entity}</h1>
        <p className="text-sm text-muted-foreground">Stagione {seasonLabel(seasonYear)}</p>
      </header>

      <Card id="da-tesserare">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Da tesserare
            <Badge variant="secondary">{queue.length}</Badge>
          </CardTitle>
          <CardDescription>
            Le iscritte attive senza tessera {entity} per l&apos;anno sociale {seasonYear}. Quando carichi
            la tessera, l&apos;allieva passa in fondo, fra le tesserate.
            {incomplete > 0
              ? ` ${incomplete} con dati da completare: li sistema la segreteria.`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nessuna da tesserare"
              description="Quando la segreteria iscrive qualcuna senza tessera, la trovi qui."
            />
          ) : (
            <>
              <TesseramentoExportButton
                rows={queue}
                variant="card-manager"
                size="lg"
                label="Scarica l'elenco"
                entity={entity}
                seasonYear={seasonYear}
                asdName={brand?.asdName ?? null}
                logoUrl={brand?.logoUrl ?? null}
              />
              <ul className="divide-y rounded-md border">
                {queue.map((r) => (
                  <li key={r.id} className="space-y-2 p-3">
                    <p className="font-medium">
                      {r.lastName} {r.firstName}
                    </p>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      <Field label="Nata il" value={formatDateShort(r.dateOfBirth)} />
                      <Field label="Luogo di nascita" value={birthPlace(r)} />
                      <Field label="Codice fiscale" value={r.fiscalCode ?? ""} mono />
                      <Field label="Residenza" value={residence(r)} />
                    </dl>
                    {r.missing.length > 0 ? (
                      <p className={cn("text-xs", TONE_TEXT[statusTone({ kind: "contributions", overdue: true })])}>
                        Manca {r.missing.join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <CardImport entity={entity} />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Tesserate quest&apos;anno
            <Badge variant="secondary">{cards.length}</Badge>
          </CardTitle>
          <CardDescription>Le tessere {entity} dell&apos;anno sociale {seasonYear} già in archivio.</CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nessuna tessera ancora"
              description="Le tessere che carichi compaiono qui, con numero e scadenza."
            />
          ) : (
            <ul className="divide-y rounded-md border">
              {cards.map((c) => (
                // Telefono: nome e numero sulla prima riga, «Apri PDF» largo
                // sotto. Da 768 tutto su una riga, il tasto in fondo.
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {c.lastName} {c.firstName}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    <span className="block font-mono text-foreground">n. {c.cardNumber ?? "—"}</span>
                    {c.expiryDate ? `scade il ${formatDateShort(c.expiryDate)}` : null}
                  </span>
                  {/* Un link, non un tasto con window.open: su iPad Safari
                      apre l'anteprima del PDF (route /tessere/pdf/[id]) */}
                  {c.hasFile ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 w-full md:h-9 md:w-auto"
                    >
                      <a href={`/tessere/pdf/${c.id}`} target="_blank" rel="noopener">
                        <FileText className="h-4 w-4" />
                        Apri PDF
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
