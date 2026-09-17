// Nome del file PDF di una ricevuta: numero e allieva.
//
// Funzione pura, senza "server-only": la usa il server per il header
// Content-Disposition e il client per il File passato a navigator.share(),
// così il file che Giuseppina condivide su WhatsApp si chiama come quello
// che scarica.

const FILENAME_FORBIDDEN = new Set(['"', "<", ">", ":", "|", "?", "*"])

function stripUnsafeFileChars(value: string): string {
  let out = ""
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code < 0x20 || code === 0x7f || FILENAME_FORBIDDEN.has(ch)) continue
    out += ch
  }
  return out
}

// Doppia forma: ASCII (compatibilità) + UTF-8 (accenti).
export function receiptPdfFileName(receipt: {
  receiptNumber: string
  athleteName: string
}): { ascii: string; utf8: string } {
  const base = stripUnsafeFileChars(
    `Ricevuta ${receipt.receiptNumber} - ${receipt.athleteName}`.replace(
      /[/\\]/g,
      "-",
    ),
  )
    .replace(/\s+/g, " ")
    .trim()

  const ascii = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9 ._-]/g, "_")

  return { ascii: `${ascii}.pdf`, utf8: `${base}.pdf` }
}
