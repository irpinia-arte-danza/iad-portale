import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Vedi src/test/server-only.ts
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    // .tsx per i test che rendono un componente con react-dom/server:
    // niente jsdom, si guarda il markup che esce (vedi responsive-list)
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
