import "server-only"

import { createAdminClient } from "./admin-client"

export const RECEIPTS_BUCKET = "receipts"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Archivio dei PDF delle ricevute così come emessi. Bucket privato: nessuna
// policy, si legge e si scrive solo lato server con la service role. I file
// non si cancellano mai (conservazione 10 anni, anche per ricevute annullate):
// questo modulo non espone rimozioni né sovrascritture.
export type ReceiptPdfStorage = {
  // "stored": file scritto ora; "exists": c'era già e resta quello
  upload(path: string, pdf: Uint8Array): Promise<"stored" | "exists">
  // null se il file non esiste
  download(path: string): Promise<Uint8Array | null>
}

type StorageErrorLike = {
  message: string
  status?: unknown
  statusCode?: unknown
}

function statusOf(error: StorageErrorLike): string {
  return String(error.statusCode ?? error.status ?? "")
}

let bucketReady = false

// Il bucket nasce al primo archivio, privato e solo PDF. Se esiste già ma è
// pubblico ci si ferma: i PDF contengono nomi e codici fiscali.
async function ensureReceiptsBucket(): Promise<void> {
  if (bucketReady) return
  const supabase = createAdminClient()

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Storage listBuckets: ${error.message}`)

  const bucket = buckets?.find((b) => b.id === RECEIPTS_BUCKET)
  if (bucket?.public) {
    throw new Error(
      `Bucket ${RECEIPTS_BUCKET} pubblico: archiviazione delle ricevute bloccata`,
    )
  }

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(
      RECEIPTS_BUCKET,
      {
        public: false,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: ["application/pdf"],
      },
    )
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Storage createBucket: ${createError.message}`)
    }
  }

  bucketReady = true
}

export const supabaseReceiptStorage: ReceiptPdfStorage = {
  async upload(path, pdf) {
    await ensureReceiptsBucket()
    const { error } = await createAdminClient()
      .storage.from(RECEIPTS_BUCKET)
      .upload(path, Buffer.from(pdf), {
        contentType: "application/pdf",
        upsert: false,
      })
    if (!error) return "stored"

    const storageError = error as StorageErrorLike
    if (
      statusOf(storageError) === "409" ||
      /already exists|duplicate/i.test(storageError.message)
    ) {
      return "exists"
    }
    throw new Error(`Storage upload: ${storageError.message}`)
  },

  async download(path) {
    const { data, error } = await createAdminClient()
      .storage.from(RECEIPTS_BUCKET)
      .download(path)
    if (error) {
      const storageError = error as StorageErrorLike
      if (
        statusOf(storageError) === "404" ||
        /not found/i.test(storageError.message)
      ) {
        return null
      }
      throw new Error(`Storage download: ${storageError.message}`)
    }
    return new Uint8Array(await data.arrayBuffer())
  },
}
