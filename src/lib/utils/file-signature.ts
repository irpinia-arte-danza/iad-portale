export type MagicMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/x-icon"
  | "image/vnd.microsoft.icon"

function hasBytes(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  if (bytes.length < offset + expected.length) return false
  return expected.every((b, i) => bytes[offset + i] === b)
}

function matchesPdf(bytes: Uint8Array): boolean {
  const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d]
  if (hasBytes(bytes, 0, pdf)) return true
  return hasBytes(bytes, 3, pdf) && hasBytes(bytes, 0, [0xef, 0xbb, 0xbf])
}

export function detectMimeFromSignature(buffer: ArrayBuffer): MagicMime | null {
  const bytes = new Uint8Array(buffer.slice(0, 16))

  if (matchesPdf(bytes)) return "application/pdf"
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return "image/png"
  if (
    hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp"
  }
  if (hasBytes(bytes, 0, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon"

  return null
}

export async function validateFileSignature(
  file: File,
  allowedMimes: readonly string[],
): Promise<string | null> {
  const signatureMime = detectMimeFromSignature(await file.arrayBuffer())
  if (!signatureMime || !allowedMimes.includes(signatureMime)) {
    return "Il contenuto del file non corrisponde a un formato ammesso."
  }
  return null
}
