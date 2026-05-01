import { createAdminClient } from "./admin-client"
import { detectMimeFromSignature } from "@/lib/utils/file-signature"

export const BRAND_BUCKET = "brand"

export type BrandLogoSlot = "logo-light" | "logo-dark" | "favicon" | "logo-svg"

const SLOT_CONTENT_TYPE: Record<BrandLogoSlot, readonly string[]> = {
  "logo-light": ["image/png", "image/jpeg", "image/webp"],
  "logo-dark": ["image/png", "image/jpeg", "image/webp"],
  favicon: ["image/png", "image/x-icon", "image/vnd.microsoft.icon"],
  "logo-svg": [],
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function ensureBrandBucket(): Promise<void> {
  const supabase = createAdminClient()
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Storage: ${error.message}`)

  const exists = buckets?.some((b) => b.name === BRAND_BUCKET)
  if (exists) return

  const { error: createError } = await supabase.storage.createBucket(
    BRAND_BUCKET,
    { public: true, fileSizeLimit: MAX_BYTES },
  )
  if (createError && !createError.message.includes("already exists")) {
    throw new Error(`Storage createBucket: ${createError.message}`)
  }
}

function extForMime(mime: string): string {
  if (mime === "image/svg+xml") return "svg"
  if (mime === "image/png") return "png"
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/webp") return "webp"
  if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") return "ico"
  return "bin"
}

export async function uploadBrandAsset(
  slot: BrandLogoSlot,
  file: File,
): Promise<{ publicUrl: string; path: string }> {
  const allowed = SLOT_CONTENT_TYPE[slot]
  if (slot === "logo-svg") {
    throw new Error("Upload SVG disattivato per sicurezza. Usa PNG, JPEG o WebP.")
  }
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Formato non supportato per ${slot}. Ammessi: ${allowed.join(", ")}`,
    )
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File troppo grande (max 2 MB)")
  }

  await ensureBrandBucket()

  const supabase = createAdminClient()
  const ext = extForMime(file.type)
  const version = Date.now()
  const path = `${slot}-${version}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const signatureMime = detectMimeFromSignature(arrayBuffer)
  if (!signatureMime || !allowed.includes(signatureMime)) {
    throw new Error("Il contenuto del file non corrisponde a un formato ammesso.")
  }

  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabase.storage.from(BRAND_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })
  if (error) throw new Error(`Upload fallito: ${error.message}`)

  const { data } = supabase.storage.from(BRAND_BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl, path }
}

export async function deleteBrandAssetByUrl(publicUrl: string): Promise<void> {
  const match = publicUrl.match(/\/object\/public\/brand\/(.+)$/)
  if (!match) return

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(BRAND_BUCKET).remove([match[1]])
  if (error) {
    console.warn("[storage-brand] delete failed", {
      path: match[1],
      error: error.message,
    })
  }
}
