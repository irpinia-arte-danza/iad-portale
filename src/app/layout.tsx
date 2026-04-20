import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IAD Portale",
    template: "%s | IAD Portale",
  },
  description: "Gestionale A.S.D. IAD Irpinia Arte Danza — Montella (AV)",
  applicationName: "IAD Portale",
  authors: [{ name: "A.S.D. IAD Irpinia Arte Danza" }],
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
