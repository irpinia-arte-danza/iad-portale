import { readFile } from "node:fs/promises"
import path from "node:path"

import type { Metadata } from "next"
import Link from "next/link"

import { Markdown } from "@/components/markdown"
import { Card, CardContent } from "@/components/ui/card"
import { markdownTitle, parseMarkdown } from "@/lib/content/markdown"

// L'informativa privacy, pubblica: la legge chi riceve l'invito prima di
// avere un accesso, e chi non ne avrà mai uno. Il testo è content/privacy.md,
// reso qui; la pagina non dipende da niente di dinamico e viene generata al
// build (il file si legge una volta sola, in build).
export const dynamic = "force-static"

const PRIVACY_FILE = path.join(process.cwd(), "content", "privacy.md")

async function loadPrivacy() {
  const source = await readFile(PRIVACY_FILE, "utf8")
  return parseMarkdown(source)
}

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await loadPrivacy()
  return { title: markdownTitle(blocks) ?? "Informativa privacy" }
}

export default async function PrivacyPage() {
  const blocks = await loadPrivacy()

  return (
    <main className="flex min-h-dvh justify-center bg-background p-4">
      <div className="w-full max-w-2xl py-4">
        <Card>
          <CardContent className="pt-6">
            <Markdown blocks={blocks} />
          </CardContent>
        </Card>
        <footer className="mt-2 text-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center px-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Torna alla pagina di accesso
          </Link>
        </footer>
      </div>
    </main>
  )
}
