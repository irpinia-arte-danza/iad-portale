// ─────────────────────────────────────────────────────────────────────────
// I periodi del Bilancio.
//
// Prima c'erano quattro tasti e, sempre a vista, due campi data: sei
// controlli per una domanda che nove volte su dieci è "com'è andato
// quest'anno". Adesso sono quattro chip su una riga, e le date libere
// compaiono solo dietro "Altro periodo".
//
// Le date sono stringhe "yyyy-mm-dd" (quelle dell'URL) e "oggi" è il giorno
// di Roma passato dalla pagina: qui non si legge l'orologio, così il chip
// attivo è lo stesso sul server e nel browser.
// ─────────────────────────────────────────────────────────────────────────

export type BilancioPreset = "anno-fiscale" | "ultimi-3-mesi" | "mese-corrente"

export const BILANCIO_PRESETS: { key: BilancioPreset; label: string }[] = [
  { key: "anno-fiscale", label: "Anno fiscale" },
  { key: "ultimi-3-mesi", label: "Ultimi 3 mesi" },
  { key: "mese-corrente", label: "Mese corrente" },
]

export type IsoRange = { from: string; to: string }

function iso(year: number, monthIndex: number, day: number): string {
  // Date.UTC normalizza mesi fuori intervallo (−1 → dicembre dell'anno prima)
  const d = new Date(Date.UTC(year, monthIndex, day))
  return d.toISOString().slice(0, 10)
}

// Ultimo giorno del mese: il giorno 0 del mese dopo
function endOfMonthIso(year: number, monthIndex: number): string {
  return iso(year, monthIndex + 1, 0)
}

export function bilancioPresetRange(
  preset: BilancioPreset,
  todayIso: string,
): IsoRange {
  const [year, month] = todayIso.split("-").map(Number)
  const monthIndex = month - 1

  switch (preset) {
    case "anno-fiscale":
      return { from: iso(year, 0, 1), to: iso(year, 11, 31) }
    case "ultimi-3-mesi":
      // Tre mesi di calendario, quello in corso compreso
      return {
        from: iso(year, monthIndex - 2, 1),
        to: endOfMonthIso(year, monthIndex),
      }
    case "mese-corrente":
      return {
        from: iso(year, monthIndex, 1),
        to: endOfMonthIso(year, monthIndex),
      }
  }
}

/** Quale chip è acceso: null = un intervallo scelto a mano ("Altro periodo") */
export function matchBilancioPreset(
  range: IsoRange,
  todayIso: string,
): BilancioPreset | null {
  for (const { key } of BILANCIO_PRESETS) {
    const preset = bilancioPresetRange(key, todayIso)
    if (preset.from === range.from && preset.to === range.to) return key
  }
  return null
}
