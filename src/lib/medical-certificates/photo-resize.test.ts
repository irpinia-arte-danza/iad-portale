import { describe, expect, it } from "vitest"

import {
  encodeWithinTarget,
  isHeic,
  jpegName,
  PHOTO_JPEG_QUALITY,
  PHOTO_TARGET_BYTES,
  planForFile,
  prepareCertificateFile,
  resizeTarget,
  UNSUPPORTED_ERROR,
} from "./photo-resize"

describe("resizeTarget", () => {
  it("4000×3000 → 2000×1500", () => {
    expect(resizeTarget({ width: 4000, height: 3000 })).toEqual({
      width: 2000,
      height: 1500,
      resized: true,
    })
  })

  it("1200×900 resta com'è: una foto piccola non si ingrandisce", () => {
    expect(resizeTarget({ width: 1200, height: 900 })).toEqual({
      width: 1200,
      height: 900,
      resized: false,
    })
  })

  it("in verticale il lato lungo è l'altezza", () => {
    expect(resizeTarget({ width: 3024, height: 4032 })).toEqual({
      width: 1500,
      height: 2000,
      resized: true,
    })
  })

  it("esattamente 2000 di lato lungo: invariata", () => {
    expect(resizeTarget({ width: 2000, height: 1000 }).resized).toBe(false)
  })

  it("le proporzioni si conservano", () => {
    const out = resizeTarget({ width: 5000, height: 2000 })
    expect(out.width / out.height).toBeCloseTo(5000 / 2000, 2)
    expect(Math.max(out.width, out.height)).toBe(2000)
  })
})

describe("planForFile", () => {
  it("un PDF non si tocca", () => {
    expect(planForFile({ type: "application/pdf", name: "certificato.pdf" })).toBe(
      "KEEP",
    )
  })

  it("una foto si ridisegna", () => {
    expect(planForFile({ type: "image/jpeg", name: "IMG_1.jpg" })).toBe("RESIZE")
    expect(planForFile({ type: "image/png", name: "scan.png" })).toBe("RESIZE")
  })

  it("un HEIC si prova a convertire, anche se il browser non dice il tipo", () => {
    expect(planForFile({ type: "image/heic", name: "IMG_2.HEIC" })).toBe("RESIZE")
    expect(planForFile({ type: "", name: "IMG_2.HEIC" })).toBe("RESIZE")
    expect(isHeic({ type: "", name: "IMG_2.heif" })).toBe(true)
  })

  it("un documento di testo non è né foto né PDF", () => {
    expect(
      planForFile({ type: "application/msword", name: "certificato.doc" }),
    ).toBe("REJECT")
    expect(planForFile({ type: "", name: "certificato" })).toBe("REJECT")
  })
})

describe("jpegName", () => {
  it("dopo il canvas il file è un JPEG, e il nome lo dice", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg")
    expect(jpegName("foto.certificato.png")).toBe("foto.certificato.jpg")
    expect(jpegName("image")).toBe("image.jpg")
    expect(jpegName(".heic")).toBe("certificato.jpg")
  })
})

describe("encodeWithinTarget", () => {
  const MB = 1024 * 1024
  // Un encoder finto: il peso del JPEG cresce con la qualità
  const encoderFor = (bytesAt: Record<number, number>) => {
    const calls: number[] = []
    const encode = async (quality: number) => {
      calls.push(quality)
      return new Blob([new Uint8Array(bytesAt[quality] ?? 0)], { type: "image/jpeg" })
    }
    return { encode, calls }
  }

  it("una foto normale si ferma a 0,8", async () => {
    const { encode, calls } = encoderFor({ 0.8: 500 * 1024 })
    const blob = await encodeWithinTarget(encode)
    expect(blob?.size).toBe(500 * 1024)
    expect(calls).toEqual([PHOTO_JPEG_QUALITY])
  })

  it("una foto da 6 MB piena di dettagli scende sotto 1 MB abbassando la qualità", async () => {
    const { encode, calls } = encoderFor({
      0.8: 1.8 * MB,
      0.7: 1.3 * MB,
      0.6: 0.9 * MB,
      0.5: 0.7 * MB,
    })
    const blob = await encodeWithinTarget(encode)
    expect(blob!.size).toBeLessThanOrEqual(PHOTO_TARGET_BYTES)
    expect(calls).toEqual([0.8, 0.7, 0.6])
  })

  it("se nessuna qualità basta torna la più leggera: il limite lo controlla chi carica", async () => {
    const { encode, calls } = encoderFor({
      0.8: 3 * MB,
      0.7: 2.5 * MB,
      0.6: 2 * MB,
      0.5: 1.5 * MB,
    })
    const blob = await encodeWithinTarget(encode)
    expect(blob?.size).toBe(1.5 * MB)
    expect(calls).toEqual([0.8, 0.7, 0.6, 0.5])
  })

  it("il browser non sa scrivere il JPEG: null", async () => {
    await expect(encodeWithinTarget(async () => null)).resolves.toBeNull()
  })
})

describe("prepareCertificateFile", () => {
  it("un PDF passa invariato, anche pesante", async () => {
    const pdf = new File([new Uint8Array(3 * 1024 * 1024)], "certificato.pdf", {
      type: "application/pdf",
    })
    const prepared = await prepareCertificateFile(pdf)
    expect(prepared).toEqual({ ok: true, file: pdf, resized: false })
    if (prepared.ok) expect(prepared.file).toBe(pdf)
  })

  it("un file che non è né foto né PDF si ferma prima", async () => {
    const doc = new File(["x"], "modulo.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
    await expect(prepareCertificateFile(doc)).resolves.toEqual({
      ok: false,
      error: UNSUPPORTED_ERROR,
    })
  })
})
