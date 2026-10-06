// ─────────────────────────────────────────────────────────────────────────
// L'anteprima di un'email HTML, dentro un iframe isolato.
//
// Il corpo è il modello scritto dall'admin con i valori sostituiti: HTML.
// Renderlo con dangerouslySetInnerHTML lo faceva girare nella pagina del
// portale, con la sessione di chi guarda. Dentro un iframe con `sandbox`
// vuoto non c'è esecuzione di script, nessun form, nessuna origine: è un
// documento che si legge e basta, come nel client di posta.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  html: string
  title: string
  className?: string
}

// Un minimo di stile da client di posta: font di sistema, colore del testo,
// senza i CSS del portale (che nell'iframe non arrivano, ed è giusto così)
const BASE_STYLE =
  "body{margin:0;padding:12px;font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#171717;background:#fff;word-break:break-word}img{max-width:100%}a{color:#1d4ed8}"

export function emailPreviewDocument(html: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${BASE_STYLE}</style></head><body>${html}</body></html>`
}

export function EmailHtmlPreview({ html, title, className }: Props) {
  return (
    <iframe
      title={title}
      // sandbox vuoto: niente script, niente form, niente same-origin
      sandbox=""
      srcDoc={emailPreviewDocument(html)}
      className={className ?? "block h-64 w-full rounded border bg-white"}
    />
  )
}
