import { describe, expect, it } from "vitest"

import { pickColumns, todoGridClasses } from "./todo-grid"

// Quanti riquadri restano sull'ultima riga
function lastRow(count: number, cols: number): number {
  return count % cols === 0 ? cols : count % cols
}

describe("pickColumns", () => {
  it("cinque riquadri: 3 + 2, anche dove ce ne starebbero quattro (erano 4 + 1)", () => {
    expect(pickColumns(5, 3)).toEqual({ cols: 3, lastSpansRow: false })
    expect(pickColumns(5, 4)).toEqual({ cols: 3, lastSpansRow: false })
    expect(pickColumns(5, 5)).toEqual({ cols: 5, lastSpansRow: false })
  })

  it("mai un riquadro solo sull'ultima riga, da 2 a 12 riquadri e da 2 a 5 colonne", () => {
    for (let count = 2; count <= 12; count++) {
      for (let max = 2; max <= 5; max++) {
        const { cols, lastSpansRow } = pickColumns(count, max)
        expect(cols).toBeLessThanOrEqual(max)
        if (!lastSpansRow) {
          // Una riga sola (count ≤ colonne) non ha «ultima riga»
          if (count > cols) {
            expect(lastRow(count, cols), `${count} riquadri, max ${max}`).toBeGreaterThan(1)
          }
        }
      }
    }
  })

  it("a due colonne con un numero dispari l'ultimo prende tutta la riga", () => {
    expect(pickColumns(5, 2)).toEqual({ cols: 2, lastSpansRow: true })
    expect(pickColumns(4, 2)).toEqual({ cols: 2, lastSpansRow: false })
  })

  it("su una riga sola le colonne restano quelle massime: i riquadri non si allargano", () => {
    expect(pickColumns(2, 4)).toEqual({ cols: 4, lastSpansRow: false })
    expect(pickColumns(1, 3)).toEqual({ cols: 3, lastSpansRow: false })
  })
})

describe("todoGridClasses", () => {
  it("cinque riquadri: due colonne sul telefono con l'ultimo largo, 3 + 2 da 640 in su", () => {
    const { grid, last } = todoGridClasses(5)
    expect(grid).toContain("grid-cols-2")
    expect(grid).toContain("sm:grid-cols-3")
    expect(grid).toContain("xl:grid-cols-3")
    expect(last).toBe("max-sm:col-span-full")
  })

  it("quattro riquadri: 2 × 2 fino a 1280, poi in fila", () => {
    expect(pickColumns(4, 3)).toEqual({ cols: 2, lastSpansRow: false })
    const { grid, last } = todoGridClasses(4)
    expect(grid).toContain("sm:grid-cols-2")
    expect(grid).toContain("xl:grid-cols-4")
    expect(last).toBe("")
  })
})
