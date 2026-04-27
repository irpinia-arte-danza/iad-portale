import Image from "next/image"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { LogoutButton } from "@/components/auth/logout-button"

import { ParentTabbar } from "./_components/parent-tabbar"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const [user, brand] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isActive: true, role: true },
    }),
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: { logoUrl: true, logoDarkUrl: true, asdName: true },
    }),
  ])

  if (!user || !user.isActive || user.role !== UserRole.PARENT) {
    redirect("/login")
  }

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

      <main className="flex-1 overflow-y-auto p-4 pb-20">{children}</main>

      <ParentTabbar />
    </div>
  )
}
