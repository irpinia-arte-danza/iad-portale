// ─────────────────────────────────────────────────────────────────────────
// Più file spediti a gruppi, in ordine, senza che un gruppo superi un peso.
//
// Serve alla lettura delle tessere: otto PDF da 1 MB in una chiamata sola
// superavano il corpo della server action. Un file più pesante del tetto fa
// gruppo da solo (il limite per file lo controlla chi li ha scelti).
// `start` è l'indice del primo file del gruppo nell'elenco di partenza.
// ─────────────────────────────────────────────────────────────────────────

export type FileChunk<F> = { start: number; files: F[] }

export function chunkFilesByBytes<F extends { size: number }>(
  files: readonly F[],
  limits: { maxFiles: number; maxBytes: number },
): FileChunk<F>[] {
  const chunks: FileChunk<F>[] = []
  let bytes = 0
  files.forEach((file, index) => {
    const current = chunks.at(-1)
    if (
      current &&
      current.files.length < limits.maxFiles &&
      bytes + file.size <= limits.maxBytes
    ) {
      current.files.push(file)
      bytes += file.size
      return
    }
    chunks.push({ start: index, files: [file] })
    bytes = file.size
  })
  return chunks
}
