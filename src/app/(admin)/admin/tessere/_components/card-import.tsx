"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CARD_FILE_ACCEPT,
  CARD_MAX_FILES_PER_BATCH,
  cardFileError,
} from "@/lib/affiliations/file-rules"
import {
  buildImportPlan,
  type CardImportRow,
  type ExistingCard,
} from "@/lib/affiliations/import-plan"
import type { MatchCandidate } from "@/lib/affiliations/name-match"
import type { CardEntity } from "@/lib/affiliations/parsers"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/utils/format"

import { importCardFile, previewCardImport, type ParsedFile } from "../actions"

// Quanti file per chiamata: i PDF viaggiano interi, meglio non fare un unico
// corpo enorme. Le righe restano numerate come i file scelti.
const READ_CHUNK = 8

type Props = {
  entity: CardEntity
}

type SaveOutcome = { ok: boolean; message: string }

export function CardImport({ entity }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [files, setFiles] = React.useState<File[]>([])
  const [dragging, setDragging] = React.useState(false)
  const [reading, setReading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [progress, setProgress] = React.useState({ done: 0, total: 0 })
  const [parsedFiles, setParsedFiles] = React.useState<ParsedFile[] | null>(
    null,
  )
  const [athletes, setAthletes] = React.useState<MatchCandidate[]>([])
  const [existingCards, setExistingCards] = React.useState<ExistingCard[]>([])
  const [overrides, setOverrides] = React.useState<Record<number, string>>({})
  const [saved, setSaved] = React.useState<Record<number, SaveOutcome>>({})

  const athleteById = React.useMemo(
    () => new Map(athletes.map((a) => [a.id, a])),
    [athletes],
  )

  // Il piano si ricostruisce da zero a ogni abbinamento a mano: duplicati e
  // "già presente" restano coerenti senza tornare al server
  const rows: CardImportRow[] = React.useMemo(() => {
    if (!parsedFiles) return []
    return buildImportPlan({
      files: parsedFiles,
      athletes,
      existingCards,
      overrides,
    })
  }, [parsedFiles, athletes, existingCards, overrides])

  const readyRows = rows.filter(
    (r) => r.outcome.kind === "ready" && !saved[r.index]?.ok,
  )

  function reset() {
    setFiles([])
    setParsedFiles(null)
    setOverrides({})
    setSaved({})
    setProgress({ done: 0, total: 0 })
    if (inputRef.current) inputRef.current.value = ""
  }

  function addFiles(incoming: FileList | File[]) {
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(incoming)) {
      const error = cardFileError(file)
      if (error) rejected.push(`${file.name}: ${error}`)
      else accepted.push(file)
    }
    if (rejected.length > 0) {
      toast.error(
        rejected.length === 1
          ? rejected[0]
          : `${rejected.length} file scartati (solo PDF, max 3 MB)`,
      )
    }
    if (accepted.length === 0) return
    setFiles((prev) => {
      const merged = [...prev]
      for (const file of accepted) {
        const already = merged.some(
          (f) => f.name === file.name && f.size === file.size,
        )
        if (!already) merged.push(file)
      }
      if (merged.length > CARD_MAX_FILES_PER_BATCH) {
        toast.error(
          `Troppi file insieme: al massimo ${CARD_MAX_FILES_PER_BATCH} per volta`,
        )
        return merged.slice(0, CARD_MAX_FILES_PER_BATCH)
      }
      return merged
    })
    setParsedFiles(null)
    setSaved({})
  }

  async function onRead() {
    if (files.length === 0) return
    setReading(true)
    setSaved({})
    try {
      const collected: ParsedFile[] = []
      for (let start = 0; start < files.length; start += READ_CHUNK) {
        const chunk = files.slice(start, start + READ_CHUNK)
        const formData = new FormData()
        formData.set("entity", entity)
        formData.set("offset", String(start))
        for (const file of chunk) formData.append("files", file)

        const result = await previewCardImport(formData)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        collected.push(...(result.data?.files ?? []))
        setAthletes(result.data?.athletes ?? [])
        setExistingCards(result.data?.existingCards ?? [])
      }
      setParsedFiles(collected)
    } catch (error) {
      console.error("[tessere] lettura fallita", error)
      toast.error("Errore durante la lettura dei PDF")
    } finally {
      setReading(false)
    }
  }

  async function onConfirm() {
    const toSave = readyRows
    if (toSave.length === 0) return
    setSaving(true)
    setProgress({ done: 0, total: toSave.length })

    let okCount = 0
    const outcomes: Record<number, SaveOutcome> = {}
    // Una alla volta: l'unicità della tessera si controlla a ogni scrittura,
    // e in parallelo due file per la stessa allieva si incrocerebbero
    for (const row of toSave) {
      const file = files[row.index]
      if (!file || row.outcome.kind !== "ready") continue
      const formData = new FormData()
      formData.set("entity", entity)
      formData.set("file", file)
      formData.set("athleteId", row.outcome.athleteId)

      const result = await importCardFile(formData)
      outcomes[row.index] = result.ok
        ? { ok: true, message: "Salvata" }
        : { ok: false, message: result.error }
      if (result.ok) okCount += 1
      setSaved({ ...outcomes })
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setSaving(false)
    if (okCount > 0) {
      toast.success(
        okCount === 1 ? "1 tessera salvata" : `${okCount} tessere salvate`,
      )
      router.refresh()
    }
    if (okCount < toSave.length) {
      toast.error(
        `${toSave.length - okCount} non salvate: guarda il motivo nella riga`,
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          Carica le tessere {entity}
        </CardTitle>
        <CardDescription>
          Trascina qui tutti i PDF insieme. Il sistema li legge, li abbina alle
          allieve e mostra cosa farebbe: niente viene salvato finché non
          confermi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
          }}
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-muted",
          )}
        >
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Trascina qui i PDF delle tessere
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo PDF, max 3 MB l&apos;uno, fino a{" "}
            {CARD_MAX_FILES_PER_BATCH} per volta
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={CARD_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 min-h-11"
            onClick={() => inputRef.current?.click()}
          >
            Scegli i file
          </Button>
        </div>

        {files.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {files.length} {files.length === 1 ? "file" : "file"} scelti
            </Badge>
            <Button
              type="button"
              size="sm"
              onClick={onRead}
              disabled={reading || saving}
              className="min-h-11"
            >
              {reading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {reading ? "Lettura in corso…" : "Leggi i PDF"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={reading || saving}
              className="min-h-11"
            >
              <X className="h-4 w-4" />
              Svuota
            </Button>
          </div>
        ) : null}

        {parsedFiles ? (
          <PreviewTable
            rows={rows}
            files={files}
            athletes={athletes}
            athleteById={athleteById}
            overrides={overrides}
            onOverride={(index, athleteId) =>
              setOverrides((prev) => {
                const next = { ...prev }
                if (athleteId) next[index] = athleteId
                else delete next[index]
                return next
              })
            }
            saved={saved}
          />
        ) : null}

        {parsedFiles ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {saving
                ? `Salvataggio ${progress.done} di ${progress.total}…`
                : readyRows.length === 0
                  ? "Nessuna tessera pronta da salvare."
                  : `${readyRows.length} ${
                      readyRows.length === 1
                        ? "tessera pronta"
                        : "tessere pronte"
                    } da salvare.`}
            </p>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={saving || reading || readyRows.length === 0}
              className="min-h-11"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conferma e salva ({readyRows.length})
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OutcomeCell({
  row,
  athleteById,
  saved,
}: {
  row: CardImportRow
  athleteById: Map<string, MatchCandidate>
  saved: SaveOutcome | undefined
}) {
  if (saved) {
    return saved.ok ? (
      <Badge className="gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Salvata
      </Badge>
    ) : (
      <div className="space-y-1">
        <Badge variant="destructive" className="gap-1">
          <FileWarning className="h-3 w-3" />
          Non salvata
        </Badge>
        <p className="text-xs text-destructive">{saved.message}</p>
      </div>
    )
  }

  const { outcome } = row
  switch (outcome.kind) {
    case "ready": {
      const athlete = athleteById.get(outcome.athleteId)
      return (
        <Badge className="gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
          <CheckCircle2 className="h-3 w-3" />
          {athlete ? "Abbinata" : "Pronta"}
        </Badge>
      )
    }
    case "not_found":
      return (
        <div className="space-y-1">
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Non trovata
          </Badge>
          <p className="text-xs text-muted-foreground">
            Nessuna allieva con questo nome e questa data di nascita.
          </p>
        </div>
      )
    case "ambiguous":
      return (
        <div className="space-y-1">
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Più di una
          </Badge>
          <p className="text-xs text-muted-foreground">
            {outcome.athleteIds.length} allieve corrispondono: scegli tu.
          </p>
        </div>
      )
    case "already_present": {
      const athlete = athleteById.get(outcome.athleteId)
      return (
        <div className="space-y-1">
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Già presente
          </Badge>
          <p className="text-xs text-muted-foreground">
            {athlete
              ? `${athlete.lastName} ${athlete.firstName} ha già una tessera per quell'anno.`
              : "L'allieva ha già una tessera per quell'anno."}
          </p>
        </div>
      )
    }
    case "duplicate_number":
      return (
        <div className="space-y-1">
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Doppione
          </Badge>
          <p className="text-xs text-muted-foreground">
            {outcome.inBatch
              ? "Già presente in questo gruppo di file."
              : "Questa tessera è già in archivio."}
          </p>
        </div>
      )
    case "discarded":
      return (
        <div className="space-y-1">
          <Badge variant="destructive" className="gap-1">
            <FileWarning className="h-3 w-3" />
            Scartato
          </Badge>
          <p className="text-xs text-muted-foreground">
            {outcome.reason === "OTHER_ENTITY"
              ? "Non è una tessera di questo ente."
              : `Illeggibile: manca ${outcome.missing.join(", ")}.`}
          </p>
        </div>
      )
  }
}

function PreviewTable({
  rows,
  files,
  athletes,
  athleteById,
  overrides,
  onOverride,
  saved,
}: {
  rows: CardImportRow[]
  files: File[]
  athletes: MatchCandidate[]
  athleteById: Map<string, MatchCandidate>
  overrides: Record<number, string>
  onOverride: (index: number, athleteId: string) => void
  saved: Record<number, SaveOutcome>
}) {
  if (rows.length === 0) return null

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Tessera</TableHead>
            <TableHead>Allieva</TableHead>
            <TableHead>Scadenza</TableHead>
            <TableHead>Esito</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { outcome } = row
            const matchedId =
              outcome.kind === "ready"
                ? outcome.athleteId
                : outcome.kind === "already_present"
                  ? outcome.athleteId
                  : null
            const matched = matchedId ? athleteById.get(matchedId) : null
            const canChoose =
              !saved[row.index]?.ok &&
              (outcome.kind === "not_found" ||
                outcome.kind === "ambiguous" ||
                outcome.kind === "ready")
            const choices =
              outcome.kind === "ambiguous"
                ? athletes.filter((a) => outcome.athleteIds.includes(a.id))
                : athletes

            return (
              <TableRow key={row.index}>
                <TableCell className="max-w-[180px]">
                  <span className="block truncate text-xs text-muted-foreground">
                    {files[row.index]?.name ?? row.fileName}
                  </span>
                </TableCell>
                <TableCell>
                  {row.card ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">
                        n. {row.card.cardNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[row.card.cardType, `anno ${row.card.cardYear}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {matched ? (
                      <span className="text-sm">
                        {matched.lastName} {matched.firstName}
                      </span>
                    ) : row.card?.person ? (
                      <span className="text-xs text-muted-foreground">
                        sul PDF: {row.card.person.name}
                      </span>
                    ) : null}
                    {canChoose ? (
                      <select
                        className="min-h-9 w-full rounded-md border bg-background px-2 py-1 text-xs"
                        value={overrides[row.index] ?? matchedId ?? ""}
                        onChange={(e) => onOverride(row.index, e.target.value)}
                        aria-label="Abbina a un'allieva"
                      >
                        <option value="">— scegli l&apos;allieva —</option>
                        {choices.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.lastName} {a.firstName}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {row.card
                    ? formatDateShort(new Date(row.card.expiryDate))
                    : "—"}
                </TableCell>
                <TableCell>
                  <OutcomeCell
                    row={row}
                    athleteById={athleteById}
                    saved={saved[row.index]}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
