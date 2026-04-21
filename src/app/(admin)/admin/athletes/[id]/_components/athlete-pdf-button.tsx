"use client"

import dynamic from "next/dynamic"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AthleteCardPDF } from "@/lib/pdf/components/athlete-card"
import type {
  AthleteForPDF,
  BrandForPDF,
} from "@/app/(admin)/admin/athletes/queries"

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

function buildFilename(data: AthleteForPDF): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  const safe = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  return `scheda_${safe(data.lastName)}_${safe(data.firstName)}_${yyyy}${mm}${dd}.pdf`
}

interface AthletePDFButtonProps {
  data: AthleteForPDF
  brand: BrandForPDF | null
}

export function AthletePDFButton({ data, brand }: AthletePDFButtonProps) {
  return (
    <PDFDownloadLink
      document={<AthleteCardPDF data={data} brand={brand} />}
      fileName={buildFilename(data)}
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
          {loading ? "Generazione…" : "Esporta PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
