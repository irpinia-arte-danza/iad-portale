import type { ExpenseType } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Chi riceve i soldi di un'uscita, e come si chiama.
//
// Per l'affitto, le utenze o i costumi è un fornitore. Per un compenso
// sportivo no: chi lo riceve è il percettore, ed è la parola che compare
// sulla ricevuta della prestazione e nel conteggio della soglia annua.
// ─────────────────────────────────────────────────────────────────────────
export function expenseRecipientLabel(
  type: ExpenseType | undefined,
): "Percettore" | "Fornitore" {
  return type === "COMPENSATION" ? "Percettore" : "Fornitore"
}

// Il viola dei compensi è nel design system ("viola per compensi") ma non
// compariva da nessuna parte: nell'elenco delle uscite i compensi si
// distinguono a colpo d'occhio dal resto. È una tinta di categoria, non uno
// stato (vedi docs/gotchas.md §17.43).
export const COMPENSATION_BADGE_CLASS =
  "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
