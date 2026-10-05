"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

import { ADMIN_NAV, isNavItemActive } from "./admin-nav"

type AdminSidebarProps = {
  firstName: string | null
  lastName: string | null
  email: string
  brand: {
    logoUrl: string | null
    logoDarkUrl: string | null
    asdName: string | null
  }
}


export function AdminSidebar({
  firstName,
  lastName,
  email,
  brand,
}: AdminSidebarProps) {
  const pathname = usePathname()
  // Sotto il breakpoint la sidebar è un Sheet sopra la pagina: toccata una
  // voce va chiuso, altrimenti copre quello che si è appena aperto
  const { isMobile, setOpenMobile } = useSidebar()
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || "Admin"
  const brandName = brand.asdName || "IAD Portale"
  const lightLogo = brand.logoUrl
  const darkLogo = brand.logoDarkUrl || brand.logoUrl

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col items-start gap-1 px-2 py-1">
          {lightLogo ? (
            <>
              <Image
                src={lightLogo}
                alt={`${brandName} logo`}
                width={120}
                height={40}
                priority
                className="block h-10 w-auto object-contain dark:hidden"
              />
              {darkLogo ? (
                <Image
                  src={darkLogo}
                  alt={`${brandName} logo`}
                  width={120}
                  height={40}
                  priority
                  className="hidden h-10 w-auto object-contain dark:block"
                />
              ) : null}
            </>
          ) : (
            <span className="text-sm font-semibold">{brandName}</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {ADMIN_NAV.map((group, index) => (
          <SidebarGroup
            key={group.label ?? `gruppo-${index}`}
            className={cn(
              // Il gruppo di servizio va in fondo, sopra il footer
              group.atBottom && "mt-auto",
              // In modalità icona le etichette scompaiono (ci pensa
              // SidebarGroupLabel) e senza di loro i gruppi si confondono:
              // una riga sottile li tiene distinti sulla barra stretta
              index > 0 &&
                "group-data-[collapsible=icon]:mt-1 group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:pt-3",
            )}
          >
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isNavItemActive(item, pathname)}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false)
                          }}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-0.5 px-2 py-1 text-xs">
          <span className="truncate font-medium">{displayName}</span>
          <span className="truncate text-muted-foreground">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
