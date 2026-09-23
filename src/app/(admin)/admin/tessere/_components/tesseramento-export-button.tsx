"use client"

import dynamic from "next/dynamic"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AffiliationExportPDF } from "@/lib/pdf/components/affiliation-export"

import type { TesseramentoRow } from "../queries"

const PDFDownloadLink = dynamic(
  () =>
    import("@react-pdf/renderer").then((mod) => ({
      default: mod.PDFDownloadLink,
    })),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Caricamento PDF…
      </Button>
    ),
  },
)

type Props = {
  rows: TesseramentoRow[]
  entity: string
  seasonYear: number
  asdName: string | null
  logoUrl: string | null
}

export function TesseramentoExportButton({
  rows,
  entity,
  seasonYear,
  asdName,
  logoUrl,
}: Props) {
  if (rows.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        <FileDown className="h-4 w-4" />
        Nessuna da tesserare
      </Button>
    )
  }

  return (
    <PDFDownloadLink
      document={
        <AffiliationExportPDF
          rows={rows}
          entity={entity}
          seasonYear={seasonYear}
          asdName={asdName}
          logoUrl={logoUrl}
        />
      }
      fileName={`da_tesserare_${entity.toLowerCase()}_${seasonYear}.pdf`}
    >
      {({ loading, error }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || Boolean(error)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {loading ? "Generazione…" : `Scarica elenco (${rows.length})`}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
