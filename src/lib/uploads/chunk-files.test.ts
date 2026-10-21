import { describe, expect, it } from "vitest"

import { chunkFilesByBytes } from "./chunk-files"

const MB = 1024 * 1024
const files = (sizes: number[]) => sizes.map((size, i) => ({ name: `f${i}`, size }))

describe("chunkFilesByBytes", () => {
  it("file leggeri: gruppi da 8, numerati come l'elenco", () => {
    const chunks = chunkFilesByBytes(files(Array(10).fill(100_000)), {
      maxFiles: 8,
      maxBytes: 4 * MB,
    })
    expect(chunks.map((c) => [c.start, c.files.length])).toEqual([
      [0, 8],
      [8, 2],
    ])
  })

  it("otto PDF da 1 MB non vanno insieme: al massimo 4 MB per gruppo", () => {
    const chunks = chunkFilesByBytes(files(Array(8).fill(1 * MB)), {
      maxFiles: 8,
      maxBytes: 4 * MB,
    })
    expect(chunks.map((c) => [c.start, c.files.length])).toEqual([
      [0, 4],
      [4, 4],
    ])
  })

  it("un file più pesante del tetto fa gruppo da solo", () => {
    const chunks = chunkFilesByBytes(files([1 * MB, 5 * MB, 1 * MB]), {
      maxFiles: 8,
      maxBytes: 4 * MB,
    })
    expect(chunks.map((c) => c.files.map((f) => f.name))).toEqual([
      ["f0"],
      ["f1"],
      ["f2"],
    ])
  })

  it("nessun file, nessun gruppo", () => {
    expect(chunkFilesByBytes([], { maxFiles: 8, maxBytes: 4 * MB })).toEqual([])
  })
})
