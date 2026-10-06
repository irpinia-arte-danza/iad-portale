"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Camera, MessageCircle, Search, UserPlus, X } from "lucide-react"

import { AthleteCardLink } from "@/components/athletes/athlete-card-link"
import { EmptyState } from "@/components/empty-state"
import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CERT_FILTER_LABELS,
  CERT_FILTER_ORDER,
  type CertFilterCounts,
  type CertListFilter,
} from "@/lib/medical-certificates/list-filters"
import { planCertRequests } from "@/lib/medical-certificates/request-plan"
import { certRequestLabel } from "@/lib/medical-certificates/request-trace"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
} from "@/lib/schemas/medical-certificate"
import { statusTone, TONE_BADGE, TONE_TEXT } from "@/lib/status/tone"
import { formatDateShort } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import { MedicalCertFormDialog } from "../../athletes/[id]/_components/medical-cert-form-dialog"
import type { AthleteCertRow } from "../queries"
import { CertRequestDialog } from "./cert-request-dialog"

const ALL = "__all__"

// ─────────────────────────────────────────────────────────────────────────
// L'elenco dei certificati: una riga per allieva, con le due cose che si
// fanno da qui — caricare il certificato e chiederlo alla famiglia.
//
// Prima era una tabella con Tipo, Emesso e Scadenza: tre trattini per decine
// di righe, perché la maggior parte dei certificati mancava. "Promemoria"
// era spento proprio su quelle. E per caricare bisognava passare da scheda →
// Documenti → Aggiungi.
//
// La riga è una sola e si ridispone, come in Scadenze (#38): card sul
// telefono, due righe su tablet, una riga da 1280.
// ─────────────────────────────────────────────────────────────────────────

const GRID = cn(
  "grid items-center gap-x-3 gap-y-2",
  // Telefono: card, con i due tasti larghi in fondo
  "grid-cols-[auto_minmax(0,1fr)]",
  "[grid-template-areas:'sel_nome'_'vuoto_stato'_'vuoto_dest'_'vuoto_rich'_'azioni_azioni']",
  // Tablet e laptop: due righe, i tasti a destra
  "md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]",
  "md:[grid-template-areas:'sel_nome_stato_azioni'_'sel_dest_rich_azioni']",
  // Da 1280: una riga
  "xl:grid-cols-[auto_minmax(0,13rem)_minmax(0,1fr)_minmax(0,15rem)_minmax(0,12rem)_auto]",
  "xl:[grid-template-areas:'sel_nome_dest_stato_rich_azioni']",
)

type Props = {
  rows: AthleteCertRow[]
  filter: CertListFilter
  counts: CertFilterCounts
  courseId?: string
  courses: { id: string; name: string }[]
}

function StatusCell({ row }: { row: AthleteCertRow }) {
  // Mancante: una cella sola, non tre trattini
  if (!row.cert) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <CertStatusBadge status={row.status} />
        <span className="truncate text-xs text-muted-foreground">
          Nessun certificato
        </span>
      </span>
    )
  }
  const expired = row.status === "expired"
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      <CertStatusBadge status={row.status} />
      <span className="truncate text-xs text-muted-foreground">
        {MEDICAL_CERT_TYPE_LABELS[normalizeCertType(row.cert.type)]} ·{" "}
        {expired ? "scaduto il" : "scade il"}{" "}
        <span className="font-mono">
          {formatDateShort(new Date(row.cert.expiryDate))}
        </span>
      </span>
    </span>
  )
}

function RecipientCell({ row }: { row: AthleteCertRow }) {
  const { recipient } = row
  if (recipient.kind === "NONE") {
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
        <span className={cn("truncate text-sm", TONE_TEXT.block)}>
          Nessun genitore
        </span>
        <Link
          href={`/admin/athletes/${row.athleteId}?tab=anagrafica`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs underline underline-offset-2 md:min-h-0"
        >
          <UserPlus className="h-3 w-3" />
          Collega
        </Link>
      </span>
    )
  }
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm">
        {recipient.name}
        {recipient.kind === "ATHLETE" ? (
          <span className="text-muted-foreground"> (lei stessa)</span>
        ) : null}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {[recipient.phone, recipient.email].filter(Boolean).join(" · ") ||
          "senza email né telefono"}
      </span>
    </span>
  )
}

// Perché "Chiedi al genitore" è spento, se lo è
function requestBlocker(row: AthleteCertRow): string | null {
  if (row.status === "valid") return "Il certificato è valido"
  if (row.recipient.kind === "NONE") {
    return "Minorenne senza genitore collegato"
  }
  if (!row.recipient.phone && !row.recipient.email) {
    return "Nessun telefono né email in anagrafica"
  }
  return null
}

export function MedicalCertsClient({
  rows,
  filter,
  counts,
  courseId,
  courses,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = React.useTransition()

  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [uploadFor, setUploadFor] = React.useState<AthleteCertRow | null>(null)
  const [request, setRequest] = React.useState<{
    targets: AthleteCertRow[]
    key: number
  } | null>(null)

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === ALL) params.delete(key)
    else params.set(key, value)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? rows.filter((r) => r.athleteName.toLowerCase().includes(q))
      : rows
  }, [rows, search])

  // Si seleziona chi ha qualcosa da chiedere: le valide no
  const selectableIds = React.useMemo(
    () => visible.filter((r) => r.status !== "valid").map((r) => r.athleteId),
    [visible],
  )
  const selectedRows = React.useMemo(
    () => visible.filter((r) => selected.has(r.athleteId)),
    [visible, selected],
  )
  // Quante famiglie riceverebbero l'email: lo stesso piano che usa l'invio
  const selectedPlan = React.useMemo(
    () =>
      planCertRequests(
        selectedRows
          .filter((r) => r.emailBlocker === null)
          .map((r) => ({
            athleteId: r.athleteId,
            athleteName: r.athleteFullName,
            status: r.status,
            recipientKey: r.recipientKey,
          })),
      ),
    [selectedRows],
  )

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const headerChecked: boolean | "indeterminate" = allSelected
    ? true
    : selectedRows.length > 0
      ? "indeterminate"
      : false

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openRequest(targets: AthleteCertRow[]) {
    setRequest((prev) => ({ targets, key: (prev?.key ?? 0) + 1 }))
  }

  return (
    <div className="space-y-4">
      {/* Chip col numero: mancanti e scaduti in rosso (bloccano la lezione),
          in scadenza in ambra. Il numero è quello delle righe che aprono. */}
      <div
        role="group"
        aria-label="Filtra i certificati per stato"
        className="flex flex-wrap gap-2"
      >
        {CERT_FILTER_ORDER.map((value) => {
          const active = value === filter
          const tone =
            value === "all"
              ? "neutral"
              : statusTone({ kind: "certificate", status: value })
          return (
            <Button
              key={value}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className={cn(
                "h-11 gap-2 rounded-full px-4",
                !active && counts[value] > 0 && TONE_BADGE[tone],
              )}
              onClick={() => updateParam("status", value)}
            >
              <span>{CERT_FILTER_LABELS[value]}</span>
              <span className="font-mono text-xs opacity-80">
                {counts[value]}
              </span>
            </Button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={courseId ?? ALL}
          onValueChange={(value) => updateParam("corso", value)}
        >
          <SelectTrigger className="h-11 w-full sm:w-[200px]">
            <SelectValue placeholder="Corso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i corsi</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="h-11 pl-9"
            inputMode="search"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title={
            search
              ? "Nessuna allieva con questo nome"
              : `Nessun certificato fra «${CERT_FILTER_LABELS[filter]}»`
          }
          description={
            search
              ? "Prova con un altro nome o togli il filtro"
              : "Qui compaiono le allieve attive con il certificato in questo stato"
          }
        />
      ) : (
        <>
          {selectableIds.length > 0 ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={headerChecked}
                onCheckedChange={(c) =>
                  setSelected(c === true ? new Set(selectableIds) : new Set())
                }
                aria-label="Seleziona tutte"
                className="size-5"
              />
              Seleziona tutte ({selectableIds.length})
            </label>
          ) : null}

          <ul className="rounded-md border">
            {visible.map((row) => {
              const blocker = requestBlocker(row)
              const selectable = row.status !== "valid"
              const isSelected = selectable && selected.has(row.athleteId)
              return (
                <li
                  key={row.athleteId}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    GRID,
                    "border-b px-3 py-3 last:border-b-0 data-[state=selected]:bg-muted/50",
                  )}
                >
                  <div className="self-start [grid-area:sel] md:self-center">
                    {selectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) =>
                          toggle(row.athleteId, c === true)
                        }
                        aria-label={`Seleziona ${row.athleteName}`}
                        className="size-5"
                      />
                    ) : (
                      <span className="block size-5" aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 [grid-area:nome]">
                    {/* Unico link della riga: apre la scheda sui Documenti,
                        nel pannello da 1024 in su */}
                    <AthleteCardLink
                      athleteId={row.athleteId}
                      tab="documenti"
                      className="block truncate font-medium hover:underline"
                    >
                      {row.athleteName}
                    </AthleteCardLink>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.courses.length > 0
                        ? row.courses.map((c) => c.name).join(" · ")
                        : "Nessun corso quest'anno"}
                    </p>
                  </div>

                  <div className="min-w-0 [grid-area:dest]">
                    <RecipientCell row={row} />
                  </div>

                  <div className="min-w-0 [grid-area:stato]">
                    <StatusCell row={row} />
                  </div>

                  <div className="min-w-0 [grid-area:rich]">
                    <p className="truncate text-xs text-muted-foreground">
                      {certRequestLabel(row.lastRequest)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 [grid-area:azioni] sm:flex-row md:flex-col md:items-stretch xl:flex-row">
                    <Button
                      className="h-11"
                      variant={row.status === "valid" ? "outline" : "default"}
                      onClick={() => setUploadFor(row)}
                    >
                      <Camera className="h-4 w-4" />
                      Carica
                    </Button>
                    {/* Spento solo con un motivo, e il motivo si legge */}
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={blocker !== null}
                      title={blocker ?? undefined}
                      onClick={() => openRequest([row])}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chiedi al genitore
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Di gruppo: una richiesta per famiglia, solo per email */}
      {selectedRows.length > 0 ? (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <span className="text-sm text-muted-foreground">
            {selectedRows.length}{" "}
            {selectedRows.length === 1 ? "selezionata" : "selezionate"}
          </span>
          <div className="flex items-center gap-2">
            <Button className="h-11" onClick={() => openRequest(selectedRows)}>
              <MessageCircle className="h-4 w-4" />
              Chiedi a {selectedPlan.families}{" "}
              {selectedPlan.families === 1 ? "famiglia" : "famiglie"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelected(new Set())}
              aria-label="Annulla la selezione"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Lo stesso modulo della scheda: così la fotocamera arriva anche lì */}
      {uploadFor ? (
        <MedicalCertFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setUploadFor(null)
          }}
          mode="create"
          athleteId={uploadFor.athleteId}
        />
      ) : null}

      {request ? (
        <CertRequestDialog
          key={request.key}
          open
          onOpenChange={(open) => {
            if (!open) setRequest(null)
          }}
          targets={request.targets}
          onSent={() => setSelected(new Set())}
        />
      ) : null}
    </div>
  )
}
