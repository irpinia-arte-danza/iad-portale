import { describe, expect, it } from "vitest"

import {
  isHeic,
  jpegName,
  planForFile,
  resizeTarget,
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
