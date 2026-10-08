"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { ScrollFade } from "@/components/scroll-fade"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ATHLETE_TABS,
  DEFAULT_ATHLETE_TAB,
  type AthleteTabId,
} from "@/lib/athletes/athlete-tabs"

// Il valore vive nell'URL, non nello stato: così un link può aprire la
// scheda giusta e il tasto indietro del browser funziona. Su telefono la
// barra delle schede scorre in orizzontale invece di andare a capo.
export function AthleteTabs({
  value,
  panels,
}: {
  value: AthleteTabId
  panels: Record<AthleteTabId, React.ReactNode>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function change(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === DEFAULT_ATHLETE_TAB) params.delete("tab")
    else params.set("tab", next)
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    })
  }

  return (
    <Tabs value={value} onValueChange={change} className="min-w-0 gap-4">
      {/* Scorrono le schede dentro il loro contenitore, non la pagina */}
      <ScrollFade className="pb-1">
        <TabsList className="w-max">
          {ATHLETE_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="min-h-11">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </ScrollFade>
      {ATHLETE_TABS.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          {panels[tab.id]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
