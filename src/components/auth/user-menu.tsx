"use client"

import { useTransition } from "react"
import { CircleUser, LogOut, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { logout } from "@/app/(public)/login/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Il menu utente in alto a destra, uguale nelle quattro aree (admin,
// referente, genitori, insegnanti): tema Scuro/Chiaro ed Esci. È l'unico
// posto dove si cambia il tema; le regole sono in src/lib/theme/theme-config.ts.
export function UserMenu({ label }: { label?: string | null }) {
  const { theme, setTheme } = useTheme()
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Menu utente"
          disabled={isPending}
        >
          <CircleUser className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {label ? (
          <>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {label}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme === "light" ? "light" : "dark"}
          onValueChange={setTheme}
        >
          <DropdownMenuRadioItem value="dark" className="min-h-11">
            <Moon className="size-4" />
            Scuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" className="min-h-11">
            <Sun className="size-4" />
            Chiaro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11"
          disabled={isPending}
          onSelect={() => startTransition(() => logout())}
        >
          <LogOut className="size-4" />
          {isPending ? "Uscita..." : "Esci"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
