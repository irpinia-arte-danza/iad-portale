// ─────────────────────────────────────────────────────────────────────────
// La foto del certificato, ridotta prima di caricarla.
//
// Il genitore porta il foglio in sala e il gesto naturale su iPad è
// fotografarlo. Una foto da 12 megapixel pesa 4-6 MB: più del limite del
// portale (3 MB), e comunque troppo per un foglio A4 che deve solo essere
// leggibile. Qui si riduce sul dispositivo — lato lungo 2000 px, JPEG a
// qualità 0,8 — così parte un file da qualche centinaio di KB.
//
// Un PDF non si tocca: è già il documento.
//
// HEIC: Safari lo decodifica da solo (è il suo formato) e il canvas lo
// riscrive come JPEG. Dove il browser non lo sa leggere la conversione
// fallisce, e si dice chiaro cosa fare invece di caricare un file a metà.
//
// La parte di calcolo è pura e testata; quella che usa canvas gira solo nel
// browser.
// ─────────────────────────────────────────────────────────────────────────

export const PHOTO_MAX_SIDE = 2000
export const PHOTO_JPEG_QUALITY = 0.8

export type Size = { width: number; height: number }

/** Le dimensioni dopo la riduzione: lato lungo al massimo `maxSide` */
export function resizeTarget(
  size: Size,
  maxSide: number = PHOTO_MAX_SIDE,
): Size & { resized: boolean } {
  const longSide = Math.max(size.width, size.height)
  if (longSide <= maxSide || longSide === 0) {
    // Una foto piccola non si ingrandisce: non guadagna niente
    return { width: size.width, height: size.height, resized: false }
  }
  const scale = maxSide / longSide
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
    resized: true,
  }
}

export type FilePlan =
  // Il file passa così com'è
  | "KEEP"
  // Immagine: si ridisegna su canvas e si salva come JPEG
  | "RESIZE"
  // Né PDF né immagine
  | "REJECT"

const HEIC_EXTENSION = /\.(heic|heif)$/i

export function isHeic(file: { type: string; name: string }): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    // Alcuni browser passano il tipo vuoto per gli HEIC
    (file.type === "" && HEIC_EXTENSION.test(file.name))
  )
}

export function planForFile(file: { type: string; name: string }): FilePlan {
  if (file.type === "application/pdf") return "KEEP"
  if (file.type.startsWith("image/") || isHeic(file)) return "RESIZE"
  return "REJECT"
}

// "IMG_0042.HEIC" → "IMG_0042.jpg": dopo il canvas è un JPEG
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "")
  return `${base.length > 0 ? base : "certificato"}.jpg`
}

export const HEIC_ERROR =
  "Questa foto è in un formato che il browser non sa leggere. Scatta la foto dal portale o scegli un JPG."
export const UNSUPPORTED_ERROR =
  "Formato non supportato: servono una foto o un PDF."
export const UNREADABLE_ERROR =
  "Non riesco a leggere questa immagine. Scatta la foto dal portale o scegli un JPG."

export type PreparedFile =
  | { ok: true; file: File; resized: boolean }
  | { ok: false; error: string }

/**
 * Prepara il file per il caricamento. Solo browser (canvas).
 * O torna un file pronto, o un errore: mai un file a metà.
 */
export async function prepareCertificateFile(file: File): Promise<PreparedFile> {
  const plan = planForFile(file)
  if (plan === "REJECT") return { ok: false, error: UNSUPPORTED_ERROR }
  if (plan === "KEEP") return { ok: true, file, resized: false }

  let bitmap: ImageBitmap
  try {
    // imageOrientation: la foto scattata in verticale resta in verticale
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return { ok: false, error: isHeic(file) ? HEIC_ERROR : UNREADABLE_ERROR }
  }

  try {
    const target = resizeTarget({ width: bitmap.width, height: bitmap.height })
    const canvas = document.createElement("canvas")
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext("2d")
    if (!context) return { ok: false, error: UNREADABLE_ERROR }
    // Fondo bianco: un PNG trasparente in JPEG diventerebbe nero
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, target.width, target.height)
    context.drawImage(bitmap, 0, 0, target.width, target.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY),
    )
    if (!blob) {
      return { ok: false, error: isHeic(file) ? HEIC_ERROR : UNREADABLE_ERROR }
    }
    return {
      ok: true,
      file: new File([blob], jpegName(file.name), { type: "image/jpeg" }),
      resized: target.resized,
    }
  } finally {
    bitmap.close()
  }
}
