import { formatEuro } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Importi nei PDF.
//
// Lo stesso formatEuro del resto del portale — prima ogni PDF ricalcolava il
// separatore delle migliaia con una regex, e il simbolo stava davanti al
// numero invece che dopo come si scrive in italiano.
//
// L'unica differenza è lo spazio: Intl mette uno spazio insecabile (U+00A0)
// prima del simbolo, e il motore di @react-pdf lo misura male spezzando la
// riga nel punto sbagliato. Qui diventa uno spazio normale: l'importo è
// sempre in una cella sua, non c'è niente da tenere unito.
// ─────────────────────────────────────────────────────────────────────────
export function formatEuroPdf(cents: number): string {
  return formatEuro(cents).replace(/ /g, " ")
}

/** Come formatEuroPdf, con il segno davanti anche sui negativi */
export function formatSignedEuroPdf(cents: number): string {
  return cents < 0
    ? `-${formatEuroPdf(Math.abs(cents))}`
    : formatEuroPdf(cents)
}
