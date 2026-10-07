// ─────────────────────────────────────────────────────────────────────────
// Gli header di sicurezza di ogni risposta, letti da next.config.ts.
//
// Qui e non nel config perché il config non si testa; questa è una funzione
// pura con il suo test. Il portale è un'applicazione privata che tratta dati
// di minori: non deve mai stare dentro un frame altrui (clickjacking; i
// frame nostri sì: l'anteprima e il PDF della ricevuta sono iframe same-origin), il
// browser non deve indovinare i content-type, il referrer non deve portare
// fuori l'indirizzo delle pagine, e delle API del browser serve solo la
// fotocamera (la foto del certificato medico).
//
// La CSP è in **solo report**: scritta per quello che il portale carica
// davvero, ma prima di farla rispettare va osservata in produzione (le
// violazioni compaiono nella console del browser). Cosa bloccherebbe oggi se
// fosse enforce, e perché: vedi la PR che l'ha introdotta e il commento su
// scriptSrc qui sotto.
// ─────────────────────────────────────────────────────────────────────────

export type SecurityHeader = { key: string; value: string }

export type SecurityHeadersOptions = {
  // Origine di Supabase (es. https://xyz.supabase.co): il logo nel bucket
  // pubblico `brand` e, in prospettiva, le chiamate dal browser
  supabaseOrigin: string | null
  // In sviluppo Next ha bisogno di eval (sourcemap, Fast Refresh) e del
  // websocket di HMR
  dev: boolean
}

// Tutto negato tranne la fotocamera, che serve a «Scatta una foto» nel
// dialog del certificato medico e del consenso
export const PERMISSIONS_POLICY = [
  "camera=(self)",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "display-capture=()",
  "fullscreen=()",
  "interest-cohort=()",
].join(", ")

export function contentSecurityPolicy(options: SecurityHeadersOptions): string {
  const supabase = options.supabaseOrigin ? [options.supabaseOrigin] : []
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline': Next inietta script inline per l'idratazione e per i
    // dati RSC. Senza nonce, con la policy enforce quelle pagine resterebbero
    // bianche: è il motivo per cui si parte in solo report.
    "script-src": ["'self'", "'unsafe-inline'", ...(options.dev ? ["'unsafe-eval'"] : [])],
    // Tailwind e Radix mettono stili inline (variabili CSS, posizione dei
    // popover); Recharts anche
    "style-src": ["'self'", "'unsafe-inline'"],
    // Logo: next/image lo serve da /_next/image, ma il bucket pubblico resta
    // raggiungibile in diretta; data:/blob: per le anteprime delle foto nei
    // dialog di caricamento
    "img-src": ["'self'", "data:", "blob:", ...supabase],
    // Geist via next/font: file nostri
    "font-src": ["'self'", "data:"],
    // Server action e navigazione RSC sono same-origin; Supabase per il
    // giorno in cui il browser gli parlerà direttamente
    "connect-src": ["'self'", ...supabase, ...(options.dev ? ["ws:", "wss:"] : [])],
    // L'unico iframe è l'anteprima della ricevuta: /ricevute/anteprima/…,
    // stessa origine. I PDF di certificati e tessere si aprono in una
    // scheda nuova (link firmato), non in un frame
    "frame-src": ["'self'"],
    // Il PDF della ricevuta viene generato nel browser con @react-pdf
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Il solo form che fa POST classico è /auth/confirm, stessa origine
    "form-action": ["'self'"],
    // Equivalente di X-Frame-Options: SAMEORIGIN per i browser moderni.
    // Non 'none': vedi FRAME_OPTIONS qui sotto
    "frame-ancestors": ["'self'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ")
}

// SAMEORIGIN, non DENY. L'header vale per la risposta che viene messa NEL
// frame: con DENY su tutte le route il browser rifiutava anche i nostri
// iframe, cioè l'anteprima della ricevuta (/ricevute/anteprima/[paymentId]) e
// il PDF emesso (/ricevute/[receiptId]): riquadro bianco su iPad,
// «Connessione negata» su Safari. Un sito esterno resta fuori comunque.
export const FRAME_OPTIONS = "SAMEORIGIN"

export function securityHeaders(options: SecurityHeadersOptions): SecurityHeader[] {
  return [
    { key: "X-Frame-Options", value: FRAME_OPTIONS },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    {
      key: "Content-Security-Policy-Report-Only",
      value: contentSecurityPolicy(options),
    },
  ]
}
