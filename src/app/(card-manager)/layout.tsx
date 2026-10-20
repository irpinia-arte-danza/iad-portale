import Image from "next/image"

import { UserMenu } from "@/components/auth/user-menu"
import { PrivacyLink } from "@/components/privacy-link"
import { requireCardManager } from "@/lib/auth/require-card-manager"
import { prisma } from "@/lib/prisma"

// L'area del referente tessere: una pagina sola, pensata per il telefono.
// Niente menu: c'è solo /tessere.
export default async function CardManagerLayout({ children }: { children: React.ReactNode }) {
  await requireCardManager()

  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { logoUrl: true, logoDarkUrl: true, asdName: true, asdEmail: true },
  })
  const asdName = brand?.asdName ?? "IAD Portale"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-2">
          {brand?.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt={asdName}
              width={28}
              height={28}
              className={
                brand.logoDarkUrl ? "h-7 w-auto object-contain dark:hidden" : "h-7 w-auto object-contain"
              }
              priority
            />
          ) : null}
          {brand?.logoDarkUrl ? (
            <Image
              src={brand.logoDarkUrl}
              alt={asdName}
              width={28}
              height={28}
              className="hidden h-7 w-auto object-contain dark:block"
              priority
            />
          ) : null}
          <span className="truncate text-sm font-semibold">{asdName}</span>
        </div>
        <UserMenu />
      </header>

      <main className="flex-1 overflow-x-hidden p-4 pb-12">
        {children}
        <footer className="mt-10 flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
          <PrivacyLink />
          {brand?.asdEmail ? (
            <a
              href={`mailto:${brand.asdEmail}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
            >
              {brand.asdEmail}
            </a>
          ) : null}
        </footer>
      </main>
    </div>
  )
}
