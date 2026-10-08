// ─────────────────────────────────────────────────────────────────────────
// La griglia dei riquadri «Da fare oggi»: mai un riquadro solo sull'ultima
// riga.
//
// Con `auto-fill` cinque riquadri a 1440 stavano 4 + 1: l'ultimo, da solo a
// sinistra, sembrava un avanzo. Qui le colonne si scelgono dal numero dei
// riquadri: il massimo che la larghezza regge, scendendo finché l'ultima
// riga non ne ha almeno due (5 → 3 + 2, 7 → 4 + 3). Se non c'è un numero di
// colonne che ci riesce (sul telefono, a due colonne, con un numero dispari)
// l'ultimo riquadro prende tutta la riga.
// ─────────────────────────────────────────────────────────────────────────

export type GridChoice = { cols: number; lastSpansRow: boolean }

export function pickColumns(count: number, maxCols: number): GridChoice {
  // Una riga sola: le colonne restano quelle massime, così due riquadri non
  // diventano due lenzuoli larghi mezza pagina
  if (count <= maxCols) return { cols: maxCols, lastSpansRow: false }
  for (let cols = maxCols; cols >= 2; cols--) {
    if (count % cols !== 1) return { cols, lastSpansRow: false }
  }
  return { cols: Math.min(2, maxCols), lastSpansRow: true }
}

// Classi scritte per intero: Tailwind non vede quelle composte a pezzi
const BASE = ["", "grid-cols-1", "grid-cols-2"] as const
const SM = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"] as const
const XL = ["", "xl:grid-cols-1", "xl:grid-cols-2", "xl:grid-cols-3", "xl:grid-cols-4"] as const

// Telefono: al più due colonne. Da 640: tre. Da 1280: quattro.
export function todoGridClasses(count: number): { grid: string; last: string } {
  const base = pickColumns(count, 2)
  const sm = pickColumns(count, 3)
  const xl = pickColumns(count, 4)
  const last = [
    base.lastSpansRow ? "max-sm:col-span-full" : "",
    sm.lastSpansRow ? "sm:max-xl:col-span-full" : "",
    xl.lastSpansRow ? "xl:col-span-full" : "",
  ]
    .filter(Boolean)
    .join(" ")
  return { grid: `grid gap-3 ${BASE[base.cols]} ${SM[sm.cols]} ${XL[xl.cols]}`, last }
}
