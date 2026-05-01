"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Search,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
  type CertStatus,
} from "@/lib/schemas/medical-certificate"
import { formatDateShort } from "@/lib/utils/format"

import {
  sendCertReminders,
  type CertReminderResult,
} from "../actions"
import type { AthleteCertRow } from "../queries"

type StatusFilter = "all" | CertStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tutti gli stati" },
  { value: "expired", label: "Scaduti" },
  { value: "expiring", label: "In scadenza" },
  { value: "missing", label: "Mancanti" },
  { value: "valid", label: "Validi" },
]

const ACTIONABLE_STATUSES = new Set<CertStatus>([
  "expired",
  "expiring",
])

function StatusBadge({ status }: { status: CertStatus }) {
  if (status === "valid") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Valido
      </Badge>
    )
  }
  if (status === "expiring") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        <AlertTriangle className="h-3 w-3" />
        In scadenza
      </Badge>
    )
  }
  if (status === "expired") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        Scaduto
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ShieldAlert className="h-3 w-3" />
      Mancante
    </Badge>
  )
}

export function MedicalCertsClient({ rows }: { rows: AthleteCertRow[] }) {
  const searchParams = useSearchParams()
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all"

  const [status, setStatus] = React.useState<StatusFilter>(
    STATUS_OPTIONS.some((o) => o.value === initialStatus)
      ? initialStatus
      : "all",
  )
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [busy, setBusy] = React.useState(false)
  const [confirmTarget, setConfirmTarget] = React.useState<
    | { kind: "single"; athleteId: string; label: string }
    | { kind: "bulk"; athleteIds: string[] }
    | null
  >(null)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false
      if (!q) return true
      return r.athleteName.toLowerCase().includes(q)
    })
  }, [rows, status, search])

  const actionableSelected = React.useMemo(() => {
    return Array.from(selected).filter((id) => {
      const row = rows.find((r) => r.athleteId === id)
      return row && ACTIONABLE_STATUSES.has(row.status)
    })
  }, [selected, rows])

  function toggleRow(athleteId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const r of filtered) {
        if (!ACTIONABLE_STATUSES.has(r.status)) continue
        if (checked) next.add(r.athleteId)
        else next.delete(r.athleteId)
      }
      return next
    })
  }

  async function runSend(athleteIds: string[]) {
    setBusy(true)
    try {
      const res = await sendCertReminders(athleteIds)
      reportSummary(res.results, res.summary, res.transportError)
      setSelected(new Set())
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore invio reminder",
      )
    } finally {
      setBusy(false)
      setConfirmTarget(null)
    }
  }

  const visibleActionableCount = filtered.filter((r) =>
    ACTIONABLE_STATUSES.has(r.status),
  ).length
  const allVisibleSelected =
    visibleActionableCount > 0 &&
    filtered
      .filter((r) => ACTIONABLE_STATUSES.has(r.status))
      .every((r) => selected.has(r.athleteId))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome..."
              className="pl-8"
              inputMode="search"
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={actionableSelected.length === 0 || busy}
          onClick={() =>
            setConfirmTarget({
              kind: "bulk",
              athleteIds: actionableSelected,
            })
          }
        >
          <Mail className="mr-1 h-4 w-4" />
          Invia reminder ai selezionati
          {actionableSelected.length > 0
            ? ` (${actionableSelected.length})`
            : ""}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nessuna allieva corrisponde ai filtri.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(v) => toggleAllVisible(v === true)}
                    disabled={visibleActionableCount === 0}
                    aria-label="Seleziona tutti"
                  />
                </TableHead>
                <TableHead>Allieva</TableHead>
                <TableHead>Genitore</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Emesso</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-44 text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const actionable = ACTIONABLE_STATUSES.has(r.status)
                const certTypeLabel = r.cert
                  ? MEDICAL_CERT_TYPE_LABELS[normalizeCertType(r.cert.type)]
                  : "—"
                return (
                  <TableRow key={r.athleteId}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.athleteId)}
                        onCheckedChange={() => toggleRow(r.athleteId)}
                        disabled={!actionable}
                        aria-label={`Seleziona ${r.athleteName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.athleteName}
                    </TableCell>
                    <TableCell>
                      {r.parentName ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{r.parentName}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.parentEmail ?? "Nessuna email"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Nessun genitore
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{certTypeLabel}</TableCell>
                    <TableCell>
                      {r.cert
                        ? formatDateShort(new Date(r.cert.issueDate))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.cert ? (
                        <div className="flex flex-col">
                          <span>
                            {formatDateShort(new Date(r.cert.expiryDate))}
                          </span>
                          {r.daysToExpiry !== null ? (
                            <span className="text-xs text-muted-foreground">
                              {r.daysToExpiry < 0
                                ? `scaduto da ${Math.abs(r.daysToExpiry)}gg`
                                : `tra ${r.daysToExpiry}gg`}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/athletes/${r.athleteId}`}>
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Apri scheda</span>
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            actionable ? "default" : "outline"
                          }
                          disabled={
                            !actionable || !r.parentEmail || busy
                          }
                          onClick={() =>
                            setConfirmTarget({
                              kind: "single",
                              athleteId: r.athleteId,
                              label: r.athleteName,
                            })
                          }
                        >
                          <Mail className="mr-1 h-4 w-4" />
                          Reminder
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.kind === "bulk"
                ? `Invia ${confirmTarget.athleteIds.length} reminder?`
                : `Invia reminder a ${confirmTarget?.kind === "single" ? confirmTarget.label : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Il genitore riceverà un&apos;email con i dettagli del
              certificato in scadenza. Le allieve senza certificato o con
              certificato valido (&gt;30 giorni) verranno saltate. Limite 3
              reminder per allieva nelle ultime 24 ore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                if (!confirmTarget) return
                if (confirmTarget.kind === "single") {
                  runSend([confirmTarget.athleteId])
                } else {
                  runSend(confirmTarget.athleteIds)
                }
              }}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invia
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function reportSummary(
  results: CertReminderResult[],
  summary: { sent: number; failed: number; skipped: number },
  transportError: string | undefined,
) {
  if (transportError) {
    toast.error(`Errore trasporto Resend: ${transportError}`)
    return
  }
  const parts: string[] = []
  if (summary.sent > 0) parts.push(`${summary.sent} inviati`)
  if (summary.failed > 0) parts.push(`${summary.failed} falliti`)
  if (summary.skipped > 0) parts.push(`${summary.skipped} saltati`)
  const msg = parts.length > 0 ? parts.join(" · ") : "Nessun invio"

  if (summary.failed > 0 || summary.skipped > 0) {
    const reasons = results
      .filter((r) => r.status !== "SENT" && r.reason)
      .slice(0, 3)
      .map((r) => `${r.athleteName}: ${r.reason}`)
      .join("\n")
    toast.warning(msg, { description: reasons || undefined })
  } else {
    toast.success(msg)
  }
}
