import "server-only"

// Estrazione del testo da un PDF, lato server.
//
// Le tessere degli enti sono PDF di testo vero, non scansioni: il testo si
// legge senza OCR. `unpdf` è PDF.js compilato per ambienti serverless (niente
// canvas, niente worker), quindi gira sulla funzione Vercel senza dipendenze
// di sistema. Il modulo è caricato solo quando serve davvero — l'import
// dinamico tiene PDF.js fuori dal bundle delle pagine che non leggono PDF.
//
// Un PDF che è una scansione produce testo vuoto: non è un errore tecnico, è
// un file che non possiamo usare, e chi chiama lo tratta come tale.

export type PdfTextResult =
  | { ok: true; text: string; pages: number }
  | { ok: false; reason: "EMPTY" | "BROKEN" }

export async function extractPdfText(
  bytes: ArrayBuffer | Uint8Array,
): Promise<PdfTextResult> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const data =
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const pdf = await getDocumentProxy(data)
    const { text, totalPages } = await extractText(pdf, { mergePages: true })
    if (!text || text.trim().length === 0) {
      return { ok: false, reason: "EMPTY" }
    }
    return { ok: true, text, pages: totalPages }
  } catch (error) {
    console.error("[pdf] estrazione testo fallita", {
      message: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, reason: "BROKEN" }
  }
}
