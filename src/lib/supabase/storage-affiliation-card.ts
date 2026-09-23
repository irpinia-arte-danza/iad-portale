import { createAdminClient } from "./admin-client"
import { CARD_ALLOWED_MIME, CARD_MAX_BYTES } from "@/lib/affiliations/file-rules"
import { detectMimeFromSignature } from "@/lib/utils/file-signature"

// Path: {athleteId}/{cardId}.pdf, come i certificati medici.
export const AFFILIATION_CARD_BUCKET = "affiliation-cards"

const ALLOWED_MIME_SET = new Set<string>(CARD_ALLOWED_MIME)

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

let bucketReady = false

// Il bucket nasce al primo caricamento, privato e solo PDF: un passaggio
// manuale in meno da ricordarsi, come già per le ricevute. Se esiste ma è
// pubblico ci si ferma invece di caricare: la tessera contiene nome, cognome
// e data di nascita di una minorenne.
async function ensureAffiliationCardBucket(): Promise<void> {
  if (bucketReady) return
  const supabase = createAdminClient()

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Storage listBuckets: ${error.message}`)

  const bucket = buckets?.find((b) => b.id === AFFILIATION_CARD_BUCKET)
  if (bucket?.public) {
    throw new Error(
      `Bucket ${AFFILIATION_CARD_BUCKET} pubblico: caricamento delle tessere bloccato`,
    )
  }

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(
      AFFILIATION_CARD_BUCKET,
      {
        public: false,
        fileSizeLimit: CARD_MAX_BYTES,
        allowedMimeTypes: ["application/pdf"],
      },
    )
    // Due caricamenti in parallelo possono arrivare qui insieme: chi perde la
    // corsa trova il bucket già fatto, e va bene così
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Storage createBucket: ${createError.message}`)
    }
  }

  bucketReady = true
}

export type UploadedCard = {
  filePath: string
  signedUrl: string
}

export async function uploadAffiliationCardFile(
  athleteId: string,
  cardId: string,
  bytes: ArrayBuffer,
): Promise<UploadedCard> {
  if (bytes.byteLength > CARD_MAX_BYTES) {
    throw new Error("File troppo grande (max 3 MB)")
  }
  const signatureMime = detectMimeFromSignature(bytes)
  if (!signatureMime || !ALLOWED_MIME_SET.has(signatureMime)) {
    throw new Error("Il contenuto del file non è un PDF.")
  }

  await ensureAffiliationCardBucket()
  const supabase = createAdminClient()
  const filePath = `${athleteId}/${cardId}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .upload(filePath, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: true,
    })
  if (uploadError) {
    throw new Error(`Upload fallito: ${uploadError.message}`)
  }

  const { data, error: signedError } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (signedError || !data?.signedUrl) {
    throw new Error(
      `Generazione URL firmato fallita: ${signedError?.message ?? "unknown"}`,
    )
  }

  return { filePath, signedUrl: data.signedUrl }
}

// URL firmato fresco per un file già caricato: quello salvato in DB scade
// dopo 24h.
export async function getAffiliationCardSignedUrl(
  filePath: string,
): Promise<string | null> {
  if (!filePath) return null
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    console.warn("[storage-affiliation-card] signed url failed", {
      filePath,
      error: error?.message,
    })
    return null
  }
  return data.signedUrl
}

export async function deleteAffiliationCardFile(
  filePath: string,
): Promise<void> {
  if (!filePath) return
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .remove([filePath])
  if (error) {
    console.warn("[storage-affiliation-card] delete failed", {
      filePath,
      error: error.message,
    })
  }
}

// Hard delete dell'allieva: via tutti i PDF della sua cartella. Errori
// loggati ma non fatali (file orfani recuperabili dalla dashboard Supabase).
export async function deleteAllAffiliationCardFilesForAthlete(
  athleteId: string,
): Promise<{ removed: number; error: string | null }> {
  if (!athleteId) return { removed: 0, error: null }
  const supabase = createAdminClient()

  const { data: items, error: listError } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .list(athleteId, { limit: 1000 })

  if (listError) {
    console.warn("[storage-affiliation-card] list failed", {
      athleteId,
      error: listError.message,
    })
    return { removed: 0, error: listError.message }
  }

  if (!items || items.length === 0) return { removed: 0, error: null }

  const paths = items.map((it) => `${athleteId}/${it.name}`)
  const { error: removeError } = await supabase.storage
    .from(AFFILIATION_CARD_BUCKET)
    .remove(paths)

  if (removeError) {
    console.warn("[storage-affiliation-card] bulk delete failed", {
      athleteId,
      count: paths.length,
      error: removeError.message,
    })
    return { removed: 0, error: removeError.message }
  }

  return { removed: paths.length, error: null }
}
