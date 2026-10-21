// ─────────────────────────────────────────────────────────────────────────
// Il limite dei file caricati dal portale, uno solo per tutti: certificati,
// moduli dei consensi, tessere.
//
// I file viaggiano dentro una server action. Il corpo della richiesta ha
// due tetti: quello di Next (serverActions.bodySizeLimit in next.config,
// 5 MB) e quello di Vercel (4,5 MB, non si cambia). Un file da 4 MB più i
// campi del modulo resta sotto entrambi. Le foto si riducono prima nel
// browser (photo-resize.ts) e arrivano a qualche centinaio di KB: i 4 MB
// servono per i PDF.
//
// Lo stesso numero vale nel browser (si blocca prima di spedire) e sul
// server (controllo vincolante). Anche i bucket di Supabase hanno un loro
// limite per file: va tenuto uguale (docs/runbook.md, «Limite dei file»).
// ─────────────────────────────────────────────────────────────────────────

export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024

// Il logo resta più stretto: è un'immagine piccola, nel bucket pubblico
// «brand» creato con questo limite
export const BRAND_LOGO_MAX_BYTES = 2 * 1024 * 1024

const MB = 1024 * 1024

// 6_291_456 → "6", 1_572_864 → "1,5": una cifra decimale solo se serve
export function formatMegabytes(bytes: number): string {
  const value = Math.round((bytes / MB) * 10) / 10
  return value.toLocaleString("it-IT", { maximumFractionDigits: 1 })
}

export function tooLargeMessage(
  bytes: number,
  maxBytes: number = UPLOAD_MAX_BYTES,
): string {
  return `File troppo grande (${formatMegabytes(bytes)} MB), massimo ${formatMegabytes(maxBytes)} MB`
}

// null se il file sta nel limite
export function uploadSizeError(
  file: { size: number },
  maxBytes: number = UPLOAD_MAX_BYTES,
): string | null {
  return file.size > maxBytes ? tooLargeMessage(file.size, maxBytes) : null
}
