import "server-only"

import { NextResponse } from "next/server"

// Pagina di messaggio minimale per le route dei PDF delle ricevute: il link si
// apre spesso da telefono o dentro Gmail/WhatsApp, un testo semplice lì è
// illeggibile. Testi statici, nessun dato dell'utente interpolato.
export function messagePage(params: {
  status: number
  title: string
  message: string
  backHref: string
}): NextResponse {
  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${params.title}</title>
<style>
body{margin:0;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#fafafa;color:#171717}
main{max-width:420px;margin:12vh auto 0;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px}
h1{font-size:18px;margin:0 0 8px}
p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#404040}
a{display:inline-block;min-height:44px;box-sizing:border-box;padding:12px 16px;border-radius:8px;background:#171717;color:#fff;text-decoration:none;font-size:15px}
</style>
</head>
<body>
<main>
<h1>${params.title}</h1>
<p>${params.message}</p>
<a href="${params.backHref}">Torna indietro</a>
</main>
</body>
</html>`

  return new NextResponse(html, {
    status: params.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
