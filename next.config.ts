import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// ─────────────────────────────────────────────────────────────────────────
// Prisma: fuori dal bundle quello che a runtime non si carica mai.
//
// `@prisma/client` sta nella lista dei pacchetti esterni di default di Next,
// quindi il tracer ne porta via l'albero intero: ~78 MB in OGNI funzione, di
// cui ~58 mai aperti. Il client generato (`.prisma/client/index.js`) richiede
// un solo runtime, `runtime/library.js`, che a sua volta carica il motore
// nativo `libquery_engine-*`. Tutto il resto serve ad altri modi di girare
// che qui non usiamo:
//   • i `*wasm-base64*` sono i motori WebAssembly dei cinque database
//     (postgresql, mysql, sqlite, sqlserver, cockroachdb) in doppia copia
//     .js/.mjs — li nomina solo `generator-build`, cioè `prisma generate`,
//     mai il runtime;
//   • `wasm-*-edge`, `edge*`, `react-native.*`, `index-browser*` sono i
//     runtime per edge, React Native e browser;
//   • `binary.*` è il motore "binary", che non usiamo (il nostro è
//     "library", il default).
//
// Non si escludono mai: `runtime/library.js` e `libquery_engine-*`. I pattern
// non nominano la piattaforma apposta — in locale il motore è
// darwin-arm64, su Vercel rhel-openssl-3.0.x.
//
// Se un domani si passa ai driver adapter o al runtime edge, queste
// esclusioni vanno tolte: l'errore sarebbe un "module not found" su
// qualunque query, immediato e rumoroso.
// ─────────────────────────────────────────────────────────────────────────
const PRISMA_UNUSED_RUNTIMES = [
  // Motori e compilatori WebAssembly, tutti i database
  "node_modules/@prisma/client/runtime/*wasm*",
  // wasm generato dal nostro schema + i suoi loader
  "node_modules/.prisma/client/*wasm*",
  "node_modules/.prisma/client/query_engine_bg.js",
  // Runtime alternativi del client
  "node_modules/@prisma/client/runtime/binary.*",
  "node_modules/@prisma/client/runtime/edge*",
  "node_modules/@prisma/client/runtime/react-native.*",
  "node_modules/@prisma/client/runtime/index-browser*",
  "node_modules/.prisma/client/edge.js",
  "node_modules/.prisma/client/index-browser.js",
];

const nextConfig: NextConfig = {
  // "**/*" copre tutte le route dell'app (pagine e route handler).
  //
  // Il proxy no, e non è una svista: la sua traccia (`middleware.js.nft.json`)
  // viene scritta fuori dal passaggio che applica queste esclusioni, quindi
  // nessuna chiave la intercetta — provate "**/*", "*", "middleware",
  // "proxy", "/middleware", "/proxy" su Next 16.2.4. Resta a ~80 MB.
  outputFileTracingExcludes: {
    "**/*": PRISMA_UNUSED_RUNTIMES,
  },
  // L'informativa privacy è un file Markdown letto da disco: deve finire nel
  // bundle della pagina anche se il tracer non segue la lettura
  outputFileTracingIncludes: {
    "/privacy": ["./content/privacy.md"],
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/brand/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
