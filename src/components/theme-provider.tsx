"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

import {
  forcedThemeFor,
  THEME_COLORS,
  THEME_META_SCRIPT,
  THEME_PROVIDER_PROPS,
} from "@/lib/theme/theme-config";

// Meta color-scheme e theme-color seguono il tema attivo anche dopo un
// cambio dal menu o una navigazione verso le pagine di accesso (scure)
function ThemeMeta() {
  const { resolvedTheme, forcedTheme } = useTheme();
  const active = (forcedTheme ?? resolvedTheme) === "light" ? "light" : "dark";

  React.useEffect(() => {
    document
      .querySelector('meta[name="color-scheme"]')
      ?.setAttribute("content", active);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[active]);
  }, [active]);

  return null;
}

// Regole e motivi in src/lib/theme/theme-config.ts
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <NextThemesProvider
      {...THEME_PROVIDER_PROPS}
      themes={[...THEME_PROVIDER_PROPS.themes]}
      forcedTheme={forcedThemeFor(pathname)}
    >
      {/* Subito dopo lo script di next-themes: legge la classe che ha messo */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: THEME_META_SCRIPT }}
      />
      <ThemeMeta />
      {children}
    </NextThemesProvider>
  );
}
