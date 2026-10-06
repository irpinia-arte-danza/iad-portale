// ─────────────────────────────────────────────────────────────────────────
// Le tacche dell'asse Y del grafico del bilancio.
//
// Lasciato a sé, il grafico sceglieva le tacche dal massimo dei dati: con un
// massimo di 1.900 € uscivano "€0 · €475 · €950 · €1425 · €1900", numeri che
// non si leggono e non si confrontano. Qui le tacche sono tonde e a passo
// costante: 0 · 500 · 1.000 · 1.500 · 2.000.
//
// Il passo è il più piccolo fra 1, 2 e 5 (per una potenza di dieci) che
// copre il massimo con al più cinque intervalli; la cima è il primo multiplo
// del passo che contiene il massimo, così la barra più alta non tocca mai il
// bordo. Tutto in centesimi, come il resto degli importi.
// ─────────────────────────────────────────────────────────────────────────

const MAX_INTERVALS = 5
const STEP_BASES = [1, 2, 5]

// Senza dati (o tutti a zero) un asse va disegnato lo stesso
const EMPTY_AXIS_TOP_CENTS = 100_00

export type AxisTicks = {
  ticks: number[]
  stepCents: number
  topCents: number
}

export function niceAxisTicks(maxCents: number): AxisTicks {
  const max = Number.isFinite(maxCents) && maxCents > 0 ? maxCents : 0
  if (max === 0) {
    return {
      ticks: [0, EMPTY_AXIS_TOP_CENTS],
      stepCents: EMPTY_AXIS_TOP_CENTS,
      topCents: EMPTY_AXIS_TOP_CENTS,
    }
  }

  const maxEur = max / 100
  let stepEur = 1
  // Si parte dalla potenza di dieci sotto il massimo e si sale finché gli
  // intervalli bastano
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxEur)) - 1)
  search: for (let power = Math.max(magnitude, 1); ; power *= 10) {
    for (const base of STEP_BASES) {
      const candidate = base * power
      if (maxEur / candidate <= MAX_INTERVALS) {
        stepEur = candidate
        break search
      }
    }
  }

  const intervals = Math.max(1, Math.ceil(maxEur / stepEur))
  const stepCents = Math.round(stepEur * 100)
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => i * stepCents)
  return { ticks, stepCents, topCents: intervals * stepCents }
}
