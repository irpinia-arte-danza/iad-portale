import { describe, expect, it } from "vitest"

import {
  columnPriority,
  visibleColumnsAt,
  type ListColumn,
} from "./responsive-list"

// Colonne finte: conta solo la priorità
const col = (key: string, priority?: "high" | "medium" | "low") =>
  ({ key, header: key, cell: () => null, priority }) as ListColumn<unknown>

const COLONNE = [
  col("nome"),
  col("eta", "medium"),
  col("stato", "high"),
  col("certificato", "high"),
  col("tessera", "medium"),
  col("genitori", "low"),
]

const keys = (bp: "md" | "lg" | "xl") =>
  visibleColumnsAt(COLONNE, bp).map((c) => c.key)

describe("visibleColumnsAt", () => {
  it("iPad verticale (768–1023): solo le colonne a priorità alta", () => {
    expect(keys("md")).toEqual(["nome", "stato", "certificato"])
  })

  it("laptop (1024): compaiono anche le medie", () => {
    expect(keys("lg")).toEqual([
      "nome",
      "eta",
      "stato",
      "certificato",
      "tessera",
    ])
  })

  it("desktop (1280): tutte", () => {
    expect(keys("xl")).toHaveLength(COLONNE.length)
  })

  it("una larghezza non toglie mai una colonna che la precedente mostrava", () => {
    const md = keys("md")
    const lg = keys("lg")
    const xl = keys("xl")
    expect(lg).toEqual(expect.arrayContaining(md))
    expect(xl).toEqual(expect.arrayContaining(lg))
  })

  it("il nome resta anche se qualcuno gli dà priorità bassa", () => {
    const colonne = [col("nome", "low"), col("stato", "high")]
    expect(columnPriority(colonne[0], 0)).toBe("high")
    expect(visibleColumnsAt(colonne, "md").map((c) => c.key)).toEqual([
      "nome",
      "stato",
    ])
  })

  it("senza priorità una colonna è alta: si vede da 768", () => {
    expect(columnPriority(col("x"), 3)).toBe("high")
  })
})
