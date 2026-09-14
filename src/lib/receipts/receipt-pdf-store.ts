import "server-only"

import { prisma } from "@/lib/prisma"
import {
  supabaseReceiptStorage,
  type ReceiptPdfStorage,
} from "@/lib/supabase/storage-receipts"

import {
  loadReceiptForPdf,
  renderReceiptPdf,
  type LoadedReceipt,
} from "./receipt-document"

// ─────────────────────────────────────────────────────────────────────────
// Archivio dei PDF delle ricevute (bucket privato "receipts").
//
// Il PDF di una ricevuta è il documento consegnato: si genera UNA volta e da
// lì in poi si serve sempre quel file, anche se cambiano template, logo o
// intestazione dell'associazione. Regole:
// - si archivia all'emissione, fuori dalla transazione che assegna il numero
//   (archiveReceiptPdf chiamata da issue-receipt.ts);
// - se l'archivio non riesce la ricevuta resta emessa: il PDF si genera e si
//   archivia al primo accesso (readReceiptPdf) o dal cron notturno;
// - un file archiviato non si rigenera, non si sovrascrive, non si cancella
//   (conservazione 10 anni, anche per le ricevute annullate);
// - il file è "come emesso": l'annullamento si aggiunge in lettura
//   (cancelled-stamp.ts).
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_TIMEOUT_MS = 10_000

export type ReceiptArchiveErrorCode = "STORAGE_UNAVAILABLE" | "STORED_FILE_MISSING"

export class ReceiptArchiveError extends Error {
  readonly code: ReceiptArchiveErrorCode

  constructor(code: ReceiptArchiveErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = "ReceiptArchiveError"
    this.code = code
  }
}

// <anno di emissione>/<numero con "/" → "-">.pdf, es. 2026/IAD-2026-27-045-S.pdf
export function receiptPdfPath(receipt: {
  receiptNumber: string
  issueDate: Date
}): string {
  const name = receipt.receiptNumber
    .replace(/\//g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "_")
  return `${receipt.issueDate.getUTCFullYear()}/${name}.pdf`
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${STORAGE_TIMEOUT_MS}ms`)),
          STORAGE_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

// Genera il PDF come emesso e prova ad archiviarlo. Se nell'archivio c'è già un
// file per questa ricevuta (scritto da un'altra richiesta, o da un upload
// andato in timeout ma poi riuscito) vince quello. Gli errori di generazione
// si propagano; quelli di archivio no: il PDF generato si serve comunque.
async function generateAndArchive(
  receipt: LoadedReceipt,
  storage: ReceiptPdfStorage,
): Promise<{ pdf: Uint8Array; archived: boolean }> {
  const generated = await renderReceiptPdf(receipt)
  const path = receiptPdfPath(receipt)

  try {
    let pdf: Uint8Array = generated
    const outcome = await withTimeout(storage.upload(path, generated), "upload")
    if (outcome === "exists") {
      const existing = await withTimeout(storage.download(path), "download")
      if (!existing) throw new Error("upload reported existing file, download found none")
      pdf = existing
    }

    await prisma.receipt.updateMany({
      where: { id: receipt.id, pdfPath: null },
      data: { pdfPath: path },
    })
    return { pdf, archived: true }
  } catch (error) {
    console.error(
      "[receipt pdf] archive failed, retried on next access or by nightly cron",
      { receiptId: receipt.id, receiptNumber: receipt.receiptNumber },
      error,
    )
    return { pdf: generated, archived: false }
  }
}

// All'emissione e dal cron notturno. Non lancia mai: restituisce true se il
// PDF risulta archiviato (ora o da prima).
export async function archiveReceiptPdf(
  receiptId: string,
  storage: ReceiptPdfStorage = supabaseReceiptStorage,
): Promise<boolean> {
  try {
    const receipt = await loadReceiptForPdf(receiptId)
    if (!receipt) return false
    if (receipt.pdfPath) return true
    const { archived } = await generateAndArchive(receipt, storage)
    return archived
  } catch (error) {
    console.error(
      "[receipt pdf] generation for archive failed",
      { receiptId },
      error,
    )
    return false
  }
}

export type ReceiptPdfSource = "archive" | "archived-now" | "not-archived"

// Per la route /ricevute/[receiptId]. Con file archiviato serve quello e non
// genera nulla; se il file risulta archiviato ma non si legge si ferma con un
// errore, mai con un PDF rigenerato (sarebbe un documento diverso).
export async function readReceiptPdf(
  receipt: LoadedReceipt,
  storage: ReceiptPdfStorage = supabaseReceiptStorage,
): Promise<{ pdf: Uint8Array; source: ReceiptPdfSource }> {
  if (receipt.pdfPath) {
    let stored: Uint8Array | null
    try {
      stored = await withTimeout(storage.download(receipt.pdfPath), "download")
    } catch (error) {
      throw new ReceiptArchiveError(
        "STORAGE_UNAVAILABLE",
        `Receipt archive unreachable for ${receipt.id}`,
        error,
      )
    }
    if (!stored) {
      throw new ReceiptArchiveError(
        "STORED_FILE_MISSING",
        `Archived PDF ${receipt.pdfPath} not found for ${receipt.id}`,
      )
    }
    return { pdf: stored, source: "archive" }
  }

  const { pdf, archived } = await generateAndArchive(receipt, storage)
  return { pdf, source: archived ? "archived-now" : "not-archived" }
}
