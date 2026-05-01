import { createAdminClient } from "./admin-client"
import { detectMimeFromSignature } from "@/lib/utils/file-signature"

export const MEDICAL_CERT_BUCKET = "medical-certificates"

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const
const ALLOWED_MIME_SET = new Set<string>(ALLOWED_MIME)

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf"
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  return "bin"
}

export type UploadedMedicalCert = {
  filePath: string
  signedUrl: string
}

// Upload del certificato. Path: {athleteId}/{certId}.{ext}.
// Bucket privato (creato manualmente da admin). Signed URL TTL 24h,
// refresh on demand via getMedicalCertSignedUrl.
export async function uploadMedicalCertFile(
  athleteId: string,
  certId: string,
  file: File,
): Promise<UploadedMedicalCert> {
  if (!ALLOWED_MIME_SET.has(file.type)) {
    throw new Error(
      `Formato non supportato. Ammessi: PDF, JPEG, PNG (ricevuto ${file.type})`,
    )
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File troppo grande (max 3 MB)")
  }

  const supabase = createAdminClient()
  const ext = extForMime(file.type)
  const filePath = `${athleteId}/${certId}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const signatureMime = detectMimeFromSignature(arrayBuffer)
  if (!signatureMime || !ALLOWED_MIME_SET.has(signatureMime)) {
    throw new Error("Il contenuto del file non corrisponde a un formato ammesso.")
  }

  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })
  if (uploadError) {
    throw new Error(`Upload fallito: ${uploadError.message}`)
  }

  const { data, error: signedError } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (signedError || !data?.signedUrl) {
    throw new Error(
      `Generazione URL firmato fallita: ${signedError?.message ?? "unknown"}`,
    )
  }

  return { filePath, signedUrl: data.signedUrl }
}

// Refresh signed URL per file già caricato (path noto da DB).
// Usato per re-display certificato con TTL fresco.
export async function getMedicalCertSignedUrl(
  filePath: string,
): Promise<string | null> {
  if (!filePath) return null
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    console.warn("[storage-medical-cert] signed url failed", {
      filePath,
      error: error?.message,
    })
    return null
  }
  return data.signedUrl
}

export async function deleteMedicalCertFile(filePath: string): Promise<void> {
  if (!filePath) return
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .remove([filePath])
  if (error) {
    console.warn("[storage-medical-cert] delete failed", {
      filePath,
      error: error.message,
    })
  }
}

// Hard-delete cleanup: rimuove tutti i file presenti nella cartella
// {athleteId}/ del bucket. Usato durante hard delete dell'allieva per
// non lasciare file orfani. Errori loggati ma non fatali (file orfani
// recuperabili manualmente da Supabase Dashboard).
export async function deleteAllMedicalCertFilesForAthlete(
  athleteId: string,
): Promise<{ removed: number; error: string | null }> {
  if (!athleteId) return { removed: 0, error: null }
  const supabase = createAdminClient()

  const { data: items, error: listError } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .list(athleteId, { limit: 1000 })

  if (listError) {
    console.warn("[storage-medical-cert] list failed", {
      athleteId,
      error: listError.message,
    })
    return { removed: 0, error: listError.message }
  }

  if (!items || items.length === 0) {
    return { removed: 0, error: null }
  }

  const paths = items.map((it) => `${athleteId}/${it.name}`)
  const { error: removeError } = await supabase.storage
    .from(MEDICAL_CERT_BUCKET)
    .remove(paths)

  if (removeError) {
    console.warn("[storage-medical-cert] bulk delete failed", {
      athleteId,
      count: paths.length,
      error: removeError.message,
    })
    return { removed: 0, error: removeError.message }
  }

  return { removed: paths.length, error: null }
}
