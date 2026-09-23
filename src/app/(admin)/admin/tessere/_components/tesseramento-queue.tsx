import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { TesseramentoRow } from "../queries"
import { TesseramentoExportButton } from "./tesseramento-export-button"

// Il passaggio che precede le tessere: ENDAS e CSEN non hanno API, il
// tesseramento lo fa a mano un referente. Qui si scarica l'elenco da mandargli.
export function TesseramentoQueue({
  rows,
  entity,
  seasonYear,
  asdName,
  logoUrl,
}: {
  rows: TesseramentoRow[]
  entity: string
  seasonYear: number
  asdName: string | null
  logoUrl: string | null
}) {
  const incomplete = rows.filter((r) => r.missing.length > 0)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Da tesserare — anno sociale {seasonYear}</CardTitle>
          <CardDescription>
            Iscritte attive senza tessera {entity} per quest&apos;anno. Scarica
            l&apos;elenco e mandalo al referente {entity}: è lui a caricarle sul
            portale dell&apos;ente.
          </CardDescription>
        </div>
        <TesseramentoExportButton
          rows={rows}
          entity={entity}
          seasonYear={seasonYear}
          asdName={asdName}
          logoUrl={logoUrl}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Tutte le iscritte attive hanno la tessera {entity} {seasonYear}.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {rows.length} da tesserare
            </Badge>
            {incomplete.length > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {incomplete.length} con dati incompleti
              </Badge>
            ) : null}
          </div>
        )}

        {incomplete.length > 0 ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">
              Da completare in anagrafica prima di mandare l&apos;elenco:
            </p>
            <ul className="mt-2 space-y-1">
              {incomplete.map((row) => (
                <li key={row.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {row.lastName} {row.firstName}
                  </span>{" "}
                  — manca {row.missing.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
