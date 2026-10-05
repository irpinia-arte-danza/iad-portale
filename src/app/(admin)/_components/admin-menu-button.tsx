"use client"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

// Sotto i 1024 la barra laterale non c'è: il menu si apre da qui. Tasto con
// icona e testo, 44 px, non un'icona sola — su iPad "Menu" si legge, tre
// barrette no.
export function AdminMenuButton() {
  const { setOpenMobile } = useSidebar()

  return (
    <Button
      variant="outline"
      className="h-11 lg:hidden"
      onClick={() => setOpenMobile(true)}
    >
      <Menu className="h-5 w-5" />
      Menu
    </Button>
  )
}
