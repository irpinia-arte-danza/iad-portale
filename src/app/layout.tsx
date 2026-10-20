import { cache } from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_THEME,
  THEME_COLORS,
  THEME_STORAGE_CLEANUP_SCRIPT,
} from "@/lib/theme/theme-config";
import "./globals.css";

const getBrandForMetadata = cache(async () => {
  try {
    return await prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: { faviconUrl: true, logoUrl: true, asdName: true },
    });
  } catch {
    return null;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandForMetadata();
  const title = brand?.asdName || "IAD Portale";
  const favicon = brand?.faviconUrl || "/favicon.ico";

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: "Gestionale A.S.D. IAD Irpinia Arte Danza — Montella (AV)",
    applicationName: title,
    authors: [{ name: "A.S.D. IAD Irpinia Arte Danza" }],
    robots: {
      index: false,
      follow: false,
    },
    icons: {
      icon: [{ url: favicon }],
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Scuro già dal server: lo script di next-themes passa a "light" prima
    // del disegno solo se l'utente l'ha scelto (src/lib/theme/theme-config.ts)
    <html
      lang="it"
      className={`${GeistSans.variable} ${GeistMono.variable} ${DEFAULT_THEME} h-full antialiased`}
      style={{ colorScheme: DEFAULT_THEME }}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content={DEFAULT_THEME} />
        <meta name="theme-color" content={THEME_COLORS[DEFAULT_THEME]} />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_STORAGE_CLEANUP_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
