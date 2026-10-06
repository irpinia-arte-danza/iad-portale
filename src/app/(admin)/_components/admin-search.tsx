"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { MessageCircle, Search, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  isSearchable,
  MIN_SEARCH_LENGTH,
  type PersonHit,
} from "@/lib/search/person-search"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

import { searchPeople } from "./search-actions"

// ─────────────────────────────────────────────────────────────────────────
// La ricerca nell'header.
//
// Il caso che conta: un genitore paga in sala, si scrive il cognome e si
// incassa. Prima erano cinque passaggi (menu, Allieve, cerca, scheda, tasto),
// adesso due.
//
// Da 768 in su è un campo nell'header che apre un Popover; sotto è
// un'icona che apre uno Sheet a tutto schermo, perché un campo di ricerca in
// una barra da 500 px toglie spazio a tutto il resto.
// ─────────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 200

export function AdminSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PersonHit[]>([])
  const [loading, setLoading] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function changeQuery(value: string) {
    setQuery(value)
    const searchable = isSearchable(value)
    // Lo stato si azzera qui e non nell'effetto: sotto i due caratteri non
    // deve restare in giro il risultato di prima
    if (!searchable) setHits([])
    setLoading(searchable)
  }

  useEffect(() => {
    if (!isSearchable(query)) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const results = await searchPeople(query)
      // Una risposta vecchia non deve sovrascrivere una ricerca più recente
      if (cancelled) return
      setHits(results)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function close() {
    setPopoverOpen(false)
    setSheetOpen(false)
  }

  function go(href: string) {
    close()
    router.push(href)
  }

  const panel = (
    <SearchPanel
      query={query}
      onQueryChange={changeQuery}
      hits={hits}
      loading={loading}
      onGo={go}
    />
  )

  return (
    <>
      {/* Tablet e desktop: il campo si vede, e dice cosa ci si cerca */}
      <div className="hidden min-w-0 flex-1 md:block md:max-w-sm">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-start gap-2 px-3 font-normal text-muted-foreground"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Cerca allieva o genitore</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) p-0"
          >
            {panel}
          </PopoverContent>
        </Popover>
      </div>

      {/* Telefono: solo l'icona, e la ricerca si prende tutto lo schermo */}
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 md:hidden"
        aria-label="Cerca allieva o genitore"
        onClick={() => setSheetOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="top" className="h-full p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Cerca allieva o genitore</SheetTitle>
          </SheetHeader>
          <div className="h-full pt-10">{panel}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SearchPanel({
  query,
  onQueryChange,
  hits,
  loading,
  onGo,
}: {
  query: string
  onQueryChange: (value: string) => void
  hits: PersonHit[]
  loading: boolean
  onGo: (href: string) => void
}) {
  // shouldFilter false: filtra il server, qui si mostra quello che arriva
  return (
    <Command shouldFilter={false} className="bg-transparent">
      <CommandInput
        value={query}
        onValueChange={onQueryChange}
        placeholder="Cerca allieva o genitore"
        autoFocus
      />
      <CommandList>
        {!isSearchable(query) ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Scrivi almeno {MIN_SEARCH_LENGTH} lettere del nome o del cognome.
          </p>
        ) : loading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Cerco…
          </p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nessuna allieva o genitore con questo nome.
          </p>
        ) : (
          <CommandGroup>
            {hits.map((hit) =>
              hit.kind === "athlete" ? (
                <AthleteRow key={`a-${hit.id}`} hit={hit} onGo={onGo} />
              ) : (
                <ParentRow key={`p-${hit.id}`} hit={hit} onGo={onGo} />
              ),
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

function Row({
  children,
  action,
  onSelect,
}: {
  children: React.ReactNode
  action: React.ReactNode
  onSelect: () => void
}) {
  return (
    <CommandItem
      className="flex items-center justify-between gap-3 px-2 py-2"
      onSelect={onSelect}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </CommandItem>
  )
}

const BADGE =
  "rounded-full px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"

function AthleteRow({
  hit,
  onGo,
}: {
  hit: Extract<PersonHit, { kind: "athlete" }>
  onGo: (href: string) => void
}) {
  const meta = [
    hit.age !== null ? `${hit.age} anni` : null,
    hit.course,
  ].filter(Boolean)

  return (
    <Row
      onSelect={() => onGo(`/admin/athletes/${hit.id}`)}
      action={
        <Button
          size="sm"
          className="h-11 shrink-0 md:h-9"
          onClick={(event) => {
            event.stopPropagation()
            onGo(`/admin/payments?incassa=${hit.id}`)
          }}
        >
          <Wallet className="h-4 w-4" />
          Incassa
        </Button>
      }
    >
      <Link
        href={`/admin/athletes/${hit.id}`}
        className="block truncate font-medium hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {hit.name}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {meta.length > 0 ? <span className="truncate">{meta.join(" · ")}</span> : null}
        {hit.certificateMissing ? (
          <span
            className={cn(
              BADGE,
              TONE_BADGE[statusTone({ kind: "certificate", status: "missing" })],
            )}
          >
            Certificato
          </span>
        ) : null}
        {hit.overdue ? (
          <span
            className={cn(
              BADGE,
              TONE_BADGE[statusTone({ kind: "contributions", overdue: true })],
            )}
          >
            In ritardo
          </span>
        ) : null}
      </div>
    </Row>
  )
}

function ParentRow({
  hit,
  onGo,
}: {
  hit: Extract<PersonHit, { kind: "parent" }>
  onGo: (href: string) => void
}) {
  return (
    <Row
      onSelect={() => onGo(`/admin/parents/${hit.id}`)}
      action={
        hit.whatsappHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 shrink-0 md:h-9"
          >
            <a
              href={hit.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        ) : null
      }
    >
      <Link
        href={`/admin/parents/${hit.id}`}
        className="block truncate font-medium hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {hit.name}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {hit.athletes.length > 0
          ? hit.athletes.join(" · ")
          : "Nessuna allieva collegata"}
      </p>
    </Row>
  )
}
