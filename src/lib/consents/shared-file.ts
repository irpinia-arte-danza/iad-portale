// ─────────────────────────────────────────────────────────────────────────
// Un modulo firmato, più consensi.
//
// Lo stesso foglio copre spesso l'informativa privacy e le liberatorie, e
// più sorelle: su Storage c'è un file solo e più righe di `consents` ne
// portano il percorso. Quindi un file si toglie dallo Storage solo quando
// nessuna riga lo punta più — e una riga nel Cestino lo punta ancora: il
// Cestino si ripristina, e il consenso ripristinato deve ritrovare il suo
// modulo.
//
// Oggi le righe spariscono davvero solo con la cancellazione definitiva di
// un'allieva o di un genitore (richiesta GDPR, a mano): è lì che serve.
// ─────────────────────────────────────────────────────────────────────────

/**
 * I file che si possono togliere dallo Storage: quelli delle righe appena
 * cancellate che nessun'altra riga (anche nel Cestino) punta ancora.
 */
export function unreferencedConsentFiles(
  removed: readonly (string | null)[],
  stillReferenced: readonly (string | null)[],
): string[] {
  const kept = new Set(stillReferenced.filter((p): p is string => !!p))
  const candidates = new Set(removed.filter((p): p is string => !!p))
  return [...candidates].filter((path) => !kept.has(path))
}
