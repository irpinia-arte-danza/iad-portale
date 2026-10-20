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
// Il modulo si manda premendo il tasto. Uno script di tre righe lo blocca
// dopo il primo invio: con due tap il secondo POST trovava il token già
// consumato e mostrava «link non valido» (vedi password-gate.ts). Senza
// JavaScript il modulo funziona lo stesso. I valori dei campi nascosti
// passano per l'escape: arrivano dall'URL.
//
// Scura come le pagine di login: il tema chiaro si sceglie dopo, dal menu
// utente.
// ─────────────────────────────────────────────────────────────────────────

// Gli unici tipi che il portale genera (access-emails.ts): tutto il resto
// non ha un link che arrivi qui
export const CONFIRM_TYPES = ["invite", "recovery"] as const
export type ConfirmType = (typeof CONFIRM_TYPES)[number]

export function isConfirmType(value: string | null): value is ConfirmType {
  return value !== null && (CONFIRM_TYPES as readonly string[]).includes(value)
}

// Lo sfondo scuro del portale (--background di .dark in globals.css)
export const DARK_THEME_COLOR = "#0a0a0a"

// Un invio solo: al primo submit il tasto si spegne e dice di attendere, i
// submit successivi (secondo tap, Invio ripetuto) vengono annullati. Il tasto
// si spegne dopo che l'invio è partito: un tasto disabilitato prima del
// submit non lo farebbe partire.
export const CONFIRM_ONCE_SCRIPT = `(function(){var f=document.getElementById("confirm");if(!f)return;f.addEventListener("submit",function(e){if(f.dataset.sent){e.preventDefault();return}f.dataset.sent="1";var b=f.querySelector("button");if(b)setTimeout(function(){b.disabled=true;b.textContent="Attendi…"},0)})})()`

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
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="${DARK_THEME_COLOR}">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:${DARK_THEME_COLOR};color:#fafafa}
main{max-width:420px;margin:12vh auto 0;background:#171717;border:1px solid #2e2e2e;border-radius:12px;padding:24px}
h1{font-size:18px;margin:0 0 8px}
p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#d4d4d4}
button{display:block;width:100%;min-height:44px;padding:12px 16px;border:0;border-radius:8px;background:#e5e5e5;color:#171717;font-size:15px;font-weight:600;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
small{display:block;margin-top:16px;font-size:13px;color:#a3a3a3}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${lead}</p>
<form method="post" action="/auth/confirm" id="confirm">
${hidden}
<button type="submit">${escapeHtml(confirmButtonLabel(params.type, params.intent))}</button>
</form>
<script>${CONFIRM_ONCE_SCRIPT}</script>
<small>Il link è personale e vale per un tempo limitato. Se non sei tu ad averlo chiesto, puoi chiudere questa pagina.</small>
</main>
</body>
</html>`
}
