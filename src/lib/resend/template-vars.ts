export type TemplateVars = Record<string, string | number | null | undefined>;

// Le variabili dei modelli ({genitore_nome}, {importo}, …) sostituite nel
// testo così come sono: per l'oggetto e per la versione testo dell'email.
export function substituteVariables(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

// I cinque caratteri che in HTML cambiano significato. Un nome non è mai
// HTML: `<` in un cognome deve arrivare al genitore come `<`, e non deve
// diventare un tag quando lo storico email viene mostrato all'admin.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// La stessa sostituzione per il corpo HTML: il modello è HTML scritto
// dall'admin e resta com'è, i valori delle variabili vengono da anagrafiche
// e importi e passano per l'escape. Un link con {link_accesso} dentro
// href="…" resta valido: l'escape dell'URL è lo stesso che fa un browser.
export function substituteVariablesHtml(template: string, vars: TemplateVars): string {
  const escaped: TemplateVars = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [
      key,
      value === undefined || value === null ? value : escapeHtml(String(value)),
    ]),
  );
  return substituteVariables(template, escaped);
}
