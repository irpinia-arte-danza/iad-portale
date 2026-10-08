"use client"

import {
  BellRing,
  Building2,
  FileText,
  History,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollFade } from "@/components/scroll-fade"
import { cn } from "@/lib/utils"

export type SettingsTabKey =
  | "account"
  | "accessi"
  | "associazione"
  | "brand"
  | "ricevute"
  | "reminder"
  | "admin"

export const SETTINGS_TABS: {
  key: SettingsTabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "accessi", label: "Accessi", icon: History },
  { key: "associazione", label: "Associazione", icon: Building2 },
  { key: "brand", label: "Brand", icon: Palette },
  { key: "ricevute", label: "Ricevute", icon: FileText },
  { key: "reminder", label: "Promemoria", icon: BellRing },
  { key: "admin", label: "Admin", icon: ShieldCheck },
]

interface SettingsNavProps {
  active: SettingsTabKey
  onChange: (key: SettingsTabKey) => void
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <>
      {/* Mobile: Select */}
      <div className="md:hidden">
        <Select
          value={active}
          onValueChange={(v) => onChange(v as SettingsTabKey)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_TABS.map((t) => {
              const Icon = t.icon
              return (
                <SelectItem key={t.key} value={t.key}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: horizontal tabs */}
      <ScrollFade className="hidden border-b md:block">
        <nav
        aria-label="Sezioni impostazioni"
        // Su iPad le sei schede non stanno in una riga: scorrono in
        // orizzontale invece di andare a capo su due righe, e il bordo destro
          // sfuma finché ce ne sono altre (ScrollFade): «Admin» restava fuori
          // schermo senza indizio
          className="flex w-max min-w-full gap-1"
      >
        {SETTINGS_TABS.map((t) => {
          const Icon = t.icon
          const isActive = t.key === active
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
        </nav>
      </ScrollFade>
    </>
  )
}
