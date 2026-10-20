"use client"

import dynamic from "next/dynamic"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AffiliationExportPDF,
  type AffiliationExportRow,
  type AffiliationExportVariant,
} from "@/lib/pdf/components/affiliation-export"

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
  rows: AffiliationExportRow[]
  // "card-manager": senza sesso e contatti, per il referente tessere
  variant?: AffiliationExportVariant
  // Tasto alto 44 px e a tutta larghezza, per la pagina del referente
  size?: "sm" | "lg"
  label?: string
  entity: string
  seasonYear: number
  asdName: string | null
  logoUrl: string | null
}

export function TesseramentoExportButton({
  rows,
  variant = "admin",
  size = "sm",
  label,
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
          variant={variant}
          entity={entity}
          seasonYear={seasonYear}
          asdName={asdName}
          logoUrl={logoUrl}
        />
      }
      fileName={`da_tesserare_${entity.toLowerCase()}_${seasonYear}.pdf`}
      // Il link avvolge il tasto: grande quanto lui, così il tocco da 44 px
      // vale su tutta l'area
      className={size === "lg" ? "inline-flex w-full sm:w-auto" : undefined}
    >
      {({ loading, error }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={size === "lg" ? "h-11 w-full sm:w-auto" : undefined}
          disabled={loading || Boolean(error)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {loading ? "Generazione…" : `${label ?? "Scarica elenco"} (${rows.length})`}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
