import "server-only"

import { randomUUID } from "node:crypto"

import {
  CONSENT_FILE_ALLOWED_MIME,
  CONSENT_FILE_MAX_BYTES,
} from "@/lib/consents/file-rules"
import { detectMimeFromSignature } from "@/lib/utils/file-signature"

import { createAdminClient } from "./admin-client"
import { SIGNED_URL_TTL_SECONDS } from "./signed-url"

// Moduli firmati dei consensi. Path: {uuid}.{ext}, senza l'id dell'allieva:
// lo stesso modulo può valere per più consensi e più sorelle, e il legame
// sta in consents.file_path.
export const CONSENT_BUCKET = "consents"

const ALLOWED_MIME_SET = new Set<string>(CONSENT_FILE_ALLOWED_MIME)

let bucketReady = false

// Il bucket nasce al primo caricamento, privato: nessun passaggio a mano su
// Supabase, come per tessere e ricevute. Se esiste ma è pubblico ci si
// ferma: il modulo porta firma, nome e dati di una minorenne.
async function ensureConsentBucket(): Promise<void> {
  if (bucketReady) return
  const supabase = createAdminClient()

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Storage listBuckets: ${error.message}`)

  const bucket = buckets?.find((b) => b.id === CONSENT_BUCKET)
  if (bucket?.public) {
    throw new Error(
      `Bucket ${CONSENT_BUCKET} pubblico: caricamento dei moduli bloccato`,
    )
  }

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(
      CONSENT_BUCKET,
      {
        public: false,
        fileSizeLimit: CONSENT_FILE_MAX_BYTES,
        allowedMimeTypes: [...CONSENT_FILE_ALLOWED_MIME],
      },
    )
    // Due caricamenti in parallelo: chi perde la corsa trova il bucket fatto
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Storage createBucket: ${createError.message}`)
    }
  }

  bucketReady = true
}

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf"
  if (mime === "image/jpeg") return "jpg"
  return "png"
}

// Un caricamento, un file: chi chiama scrive lo stesso percorso su tutti i
// consensi che il modulo copre. Nessun link al caricamento.
export async function uploadConsentFile(file: File): Promise<string> {
  if (!ALLOWED_MIME_SET.has(file.type)) {
    throw new Error("Formato non supportato. Ammessi: PDF, JPEG, PNG")
  }
  if (file.size > CONSENT_FILE_MAX_BYTES) {
    throw new Error("File troppo grande (max 3 MB)")
  }
  const bytes = await file.arrayBuffer()
  const signatureMime = detectMimeFromSignature(bytes)
  if (!signatureMime || !ALLOWED_MIME_SET.has(signatureMime)) {
    throw new Error("Il contenuto del file non corrisponde a un formato ammesso.")
  }

  await ensureConsentBucket()
  const supabase = createAdminClient()
  const filePath = `${randomUUID()}.${extForMime(file.type)}`

  const { error } = await supabase.storage
    .from(CONSENT_BUCKET)
    .upload(filePath, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    })
  if (error) throw new Error(`Upload fallito: ${error.message}`)

  return filePath
}

// Link firmato generato al clic su «Scarica»: vive SIGNED_URL_TTL_SECONDS e
// non si salva.
export async function getConsentFileSignedUrl(
  filePath: string,
): Promise<string | null> {
  if (!filePath) return null
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(CONSENT_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    console.warn("[storage-consent] signed url failed", {
      filePath,
      error: error?.message,
    })
    return null
  }
  return data.signedUrl
}

// Solo per file che nessun consenso punta più (vedi shared-file.ts), o per
// tornare indietro da un caricamento il cui salvataggio è fallito. Errori
// loggati ma non fatali.
export async function deleteConsentFiles(
  filePaths: string[],
): Promise<{ removed: number; error: string | null }> {
  if (filePaths.length === 0) return { removed: 0, error: null }
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(CONSENT_BUCKET)
    .remove(filePaths)
  if (error) {
    console.warn("[storage-consent] delete failed", {
      count: filePaths.length,
      error: error.message,
    })
    return { removed: 0, error: error.message }
  }
  return { removed: filePaths.length, error: null }
}
