import { escapeHtml } from "@/lib/resend/template-vars"

// ─────────────────────────────────────────────────────────────────────────
// La pagina che il link personale apre PRIMA di consumare il token.
//
// Il link di invito o di recupero arriva per email. Molte caselle (Outlook,
// antivirus aziendali, anteprime di WhatsApp) aprono i link che ricevono per
// controllarli: con la GET che faceva subito verifyOtp, il token era bruciato
// prima che il genitore lo toccasse, e lui vedeva «link non valido». Adesso
// la GET mostra una pagina con un tasto; il token si consuma solo al POST
// del modulo, che uno scanner non fa.
//
// Nessuno script: il modulo si manda da solo premendo il tasto, e basta.
// I valori dei campi nascosti passano per l'escape: arrivano dall'URL.
// ─────────────────────────────────────────────────────────────────────────

// Gli unici tipi che il portale genera (access-emails.ts): tutto il resto
// non ha un link che arrivi qui
export const CONFIRM_TYPES = ["invite", "recovery"] as const
export type ConfirmType = (typeof CONFIRM_TYPES)[number]

export function isConfirmType(value: string | null): value is ConfirmType {
  return value !== null && (CONFIRM_TYPES as readonly string[]).includes(value)
}

export type ConfirmPageParams = {
  tokenHash: string
  type: ConfirmType
  intent: string | null
  next: string | null
  asdName: string
}

export function confirmButtonLabel(type: ConfirmType, intent: string | null): string {
  return type === "invite" || intent === "access"
    ? "Attiva il mio accesso"
    : "Imposta la nuova password"
}

export function confirmPageHtml(params: ConfirmPageParams): string {
  const title =
    params.type === "invite" || params.intent === "access"
      ? "Il tuo accesso all'area riservata"
      : "Nuova password"
  const lead =
    params.type === "invite" || params.intent === "access"
      ? `Premi il tasto per attivare il tuo accesso all'area riservata di ${escapeHtml(params.asdName)} e scegliere la password.`
      : `Premi il tasto per scegliere una nuova password per il tuo accesso a ${escapeHtml(params.asdName)}.`
  const hidden = [
    ["token_hash", params.tokenHash],
    ["type", params.type],
    ...(params.intent ? [["intent", params.intent]] : []),
    ...(params.next ? [["next", params.next]] : []),
  ]
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
    )
    .join("\n")

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#fafafa;color:#171717}
main{max-width:420px;margin:12vh auto 0;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px}
h1{font-size:18px;margin:0 0 8px}
p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#404040}
button{display:block;width:100%;min-height:44px;padding:12px 16px;border:0;border-radius:8px;background:#171717;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
small{display:block;margin-top:16px;font-size:13px;color:#737373}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${lead}</p>
<form method="post" action="/auth/confirm">
${hidden}
<button type="submit">${escapeHtml(confirmButtonLabel(params.type, params.intent))}</button>
</form>
<small>Il link è personale e vale per un tempo limitato. Se non sei tu ad averlo chiesto, puoi chiudere questa pagina.</small>
</main>
</body>
</html>`
}
