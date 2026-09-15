import "server-only"

import {
  degrees,
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib"

// Timbri aggiunti al volo sopra un PDF di ricevuta, su ogni pagina: filigrana
// diagonale e una fascia nel margine alto (vuoto nel layout: paddingTop 36pt).
// Nessun riquadro pieno: il contenuto originale resta leggibile. Il risultato
// non si salva mai.
// - ricevuta annullata: il PDF archiviato resta quello consegnato, per
//   mostrarla all'admin si aggiunge "ANNULLATA" con data e motivo
// - anteprima prima dell'emissione: "ANTEPRIMA", perché non si stampi né si
//   consegni al posto della ricevuta

export type ReceiptCancellation = {
  cancelledAt: Date
  reason: string | null
}

const DANGER = rgb(185 / 255, 28 / 255, 28 / 255) // pdfColors.danger #b91c1c
const PREVIEW = rgb(51 / 255, 65 / 255, 85 / 255) // slate-700
const PAGE_MARGIN = 36
const WATERMARK_SIZE = 72
const WATERMARK_ANGLE = 30

// Caratteri oltre il Latin-1 che la codifica WinAnsi dei font standard sa
// scrivere: euro, trattini, apici e virgolette tipografiche, puntini
const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026,
])

function isWinAnsi(codePoint: number): boolean {
  return (
    (codePoint >= 0x20 && codePoint <= 0x7e) ||
    (codePoint >= 0xa0 && codePoint <= 0xff) ||
    WIN_ANSI_EXTRA.has(codePoint)
  )
}

// Timestamp (non colonna @db.Date): giorno di Roma
function formatDateRome(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date)
}

// I font standard del PDF coprono solo WinAnsi: caratteri diversi (emoji,
// alfabeti non latini) farebbero fallire la scrittura del testo. Il for...of
// scorre per carattere, quindi un'emoji diventa un solo "?".
function toWinAnsi(text: string): string {
  let out = ""
  for (const ch of text.normalize("NFC").replace(/\s+/g, " ")) {
    out += isWinAnsi(ch.codePointAt(0) ?? 0) ? ch : "?"
  }
  return out.trim()
}

function fitToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let cut = text
  while (cut.length > 0 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1)
  }
  return `${cut.trimEnd()}…`
}

async function stampPages(
  pdf: Uint8Array,
  stamp: {
    watermark: string
    headline: string
    detail: string | null
    color: ReturnType<typeof rgb>
  },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const headline = toWinAnsi(stamp.headline)
  const detail = stamp.detail ? toWinAnsi(stamp.detail) : null

  const textWidth = bold.widthOfTextAtSize(stamp.watermark, WATERMARK_SIZE)
  const textHeight = bold.heightAtSize(WATERMARK_SIZE, { descender: false })
  const rad = (WATERMARK_ANGLE * Math.PI) / 180

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const maxWidth = width - PAGE_MARGIN * 2

    page.drawText(fitToWidth(headline, bold, 8.5, maxWidth), {
      x: PAGE_MARGIN,
      y: height - 17,
      size: 8.5,
      font: bold,
      color: stamp.color,
    })
    if (detail) {
      page.drawText(fitToWidth(detail, regular, 8, maxWidth), {
        x: PAGE_MARGIN,
        y: height - 28,
        size: 8,
        font: regular,
        color: stamp.color,
      })
    }

    // Filigrana diagonale centrata: il punto di partenza del testo ruotato è
    // il centro pagina meno metà larghezza e metà altezza lungo gli assi ruotati
    page.drawText(stamp.watermark, {
      x: width / 2 - (textWidth / 2) * Math.cos(rad) + (textHeight / 2) * Math.sin(rad),
      y: height / 2 - (textWidth / 2) * Math.sin(rad) - (textHeight / 2) * Math.cos(rad),
      size: WATERMARK_SIZE,
      font: bold,
      color: stamp.color,
      opacity: 0.18,
      rotate: degrees(WATERMARK_ANGLE),
    })
  }

  return doc.save()
}

export async function stampCancelledReceipt(
  pdf: Uint8Array,
  cancellation: ReceiptCancellation,
): Promise<Uint8Array> {
  return stampPages(pdf, {
    watermark: "ANNULLATA",
    headline: `RICEVUTA ANNULLATA — NON VALIDA · annullata il ${formatDateRome(cancellation.cancelledAt)} a seguito dello storno del pagamento`,
    detail: cancellation.reason ? `Motivo: ${cancellation.reason}` : null,
    color: DANGER,
  })
}

export async function stampReceiptPreview(
  pdf: Uint8Array,
  preview: { receiptNumber: string },
): Promise<Uint8Array> {
  return stampPages(pdf, {
    watermark: "ANTEPRIMA",
    headline: "ANTEPRIMA — NON È UNA RICEVUTA: non stampare né consegnare",
    detail: `Il numero ${preview.receiptNumber} è quello previsto: viene assegnato solo con «Emetti ricevuta».`,
    color: PREVIEW,
  })
}
