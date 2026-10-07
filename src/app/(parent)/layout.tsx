import Image from "next/image"

import { requirePortalAccess } from "@/lib/auth/require-portal-access"
import { prisma } from "@/lib/prisma"
import { LogoutButton } from "@/components/auth/logout-button"
import { PrivacyLink } from "@/components/privacy-link"

import { ParentTabbar } from "./_components/parent-tabbar"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePortalAccess()

  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { logoUrl: true, logoDarkUrl: true, asdName: true, asdEmail: true },
  })

  const asdName = brand?.asdName ?? "IAD Portale"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          {brand?.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt={asdName}
              width={28}
              height={28}
              className={
                brand.logoDarkUrl
                  ? "h-7 w-auto object-contain dark:hidden"
                  : "h-7 w-auto object-contain"
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
          <span className="text-sm font-semibold">{asdName}</span>
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-24">
        {children}
        {/* Privacy e un recapito: a 375 px due righe, una sotto l'altra */}
        <footer className="mt-8 flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
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

      <ParentTabbar />
    </div>
  )
}
