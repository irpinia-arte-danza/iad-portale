"use client"

import * as React from "react"
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateShort } from "@/lib/utils/format"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
} from "@/lib/schemas/medical-certificate"

import {
  hardDeleteAthlete,
  hardDeleteCourse,
  hardDeleteExpense,
  hardDeleteMedicalCertificate,
  hardDeleteParent,
  hardDeleteTeacher,
  restoreAthlete,
  restoreCourse,
  restoreExpense,
  restoreMedicalCertificate,
  restoreParent,
  restoreTeacher,
} from "../actions"

type EntityKind =
  | "athlete"
  | "parent"
  | "teacher"
  | "course"
  | "expense"
  | "cert"

type HardDeleteTarget = {
  id: string
  kind: EntityKind
  label: string
  confirmExpected: string
  confirmKind: "name" | "date"
}

const HARD_DELETE_FN: Record<
  EntityKind,
  (id: string, confirm: string) => Promise<{ ok: boolean; error?: string }>
> = {
  athlete: hardDeleteAthlete,
  parent: hardDeleteParent,
  teacher: hardDeleteTeacher,
  course: hardDeleteCourse,
  expense: hardDeleteExpense,
  cert: hardDeleteMedicalCertificate,
}

type Counts = {
  athletes: number
  parents: number
  teachers: number
  courses: number
  expenses: number
  certs: number
}

type Athlete = {
  id: string
  firstName: string
  lastName: string
  fiscalCode: string | null
  deletedAt: Date | null
}
type Parent = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  deletedAt: Date | null
}
type Teacher = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  deletedAt: Date | null
}
type CourseRow = {
  id: string
  name: string
  type: string
  isActive: boolean
  deletedAt: Date | null
}
type ExpenseRow = {
  id: string
  type: string
  amountCents: number
  expenseDate: Date
  description: string | null
  deletedAt: Date | null
}
type CertRow = {
  id: string
  type: string
  issueDate: Date
  expiryDate: Date
  deletedAt: Date | null
  athlete: { id: string; firstName: string; lastName: string }
}

type Props = {
  counts: Counts
  athletes: Athlete[]
  parents: Parent[]
  teachers: Teacher[]
  courses: CourseRow[]
  expenses: ExpenseRow[]
  certs: CertRow[]
}

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

function daysAgo(date: Date | null): string {
  if (!date) return "—"
  const ms = Date.now() - new Date(date).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days <= 0) return "oggi"
  if (days === 1) return "1 giorno fa"
  return `${days} giorni fa`
}

type ConfirmTarget = {
  id: string
  label: string
  kind: EntityKind
}

const RESTORE_FN = {
  athlete: restoreAthlete,
  parent: restoreParent,
  teacher: restoreTeacher,
  course: restoreCourse,
  expense: restoreExpense,
  cert: restoreMedicalCertificate,
} as const

export function CestinoClient({
  counts,
  athletes,
  parents,
  teachers,
  courses,
  expenses,
  certs,
}: Props) {
  const [confirm, setConfirm] = React.useState<ConfirmTarget | null>(null)
  const [hardTarget, setHardTarget] = React.useState<HardDeleteTarget | null>(
    null,
  )
  const [busy, setBusy] = React.useState(false)

  async function onConfirmRestore() {
    if (!confirm) return
    setBusy(true)
    const fn = RESTORE_FN[confirm.kind]
    const result = await fn(confirm.id)
    if (result.ok) {
      toast.success(`${confirm.label} ripristinato`)
      setConfirm(null)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  return (
    <>
      <Tabs defaultValue="athletes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="athletes">
            Allieve {counts.athletes > 0 ? `(${counts.athletes})` : ""}
          </TabsTrigger>
          <TabsTrigger value="parents">
            Genitori {counts.parents > 0 ? `(${counts.parents})` : ""}
          </TabsTrigger>
          <TabsTrigger value="teachers">
            Insegnanti {counts.teachers > 0 ? `(${counts.teachers})` : ""}
          </TabsTrigger>
          <TabsTrigger value="courses">
            Corsi {counts.courses > 0 ? `(${counts.courses})` : ""}
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Spese {counts.expenses > 0 ? `(${counts.expenses})` : ""}
          </TabsTrigger>
          <TabsTrigger value="certs">
            Certificati {counts.certs > 0 ? `(${counts.certs})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="athletes">
          <CestinoTable
            empty="Nessuna allieva eliminata."
            columns={["Nome", "C.F.", "Eliminata"]}
            rows={athletes.map((a) => ({
              id: a.id,
              cells: [
                `${a.lastName} ${a.firstName}`,
                a.fiscalCode ?? "—",
                daysAgo(a.deletedAt),
              ],
              label: `${a.firstName} ${a.lastName}`,
              kind: "athlete" as const,
              confirmExpected: `${a.firstName} ${a.lastName}`,
              confirmKind: "name" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>

        <TabsContent value="parents">
          <CestinoTable
            empty="Nessun genitore eliminato."
            columns={["Nome", "Email", "Eliminato"]}
            rows={parents.map((p) => ({
              id: p.id,
              cells: [
                `${p.lastName} ${p.firstName}`,
                p.email ?? "—",
                daysAgo(p.deletedAt),
              ],
              label: `${p.firstName} ${p.lastName}`,
              kind: "parent" as const,
              confirmExpected: `${p.firstName} ${p.lastName}`,
              confirmKind: "name" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>

        <TabsContent value="teachers">
          <CestinoTable
            empty="Nessun insegnante eliminato."
            columns={["Nome", "Email", "Eliminato"]}
            rows={teachers.map((t) => ({
              id: t.id,
              cells: [
                `${t.lastName} ${t.firstName}`,
                t.email ?? "—",
                daysAgo(t.deletedAt),
              ],
              label: `${t.firstName} ${t.lastName}`,
              kind: "teacher" as const,
              confirmExpected: `${t.firstName} ${t.lastName}`,
              confirmKind: "name" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>

        <TabsContent value="courses">
          <CestinoTable
            empty="Nessun corso eliminato."
            columns={["Nome", "Tipo", "Stato", "Eliminato"]}
            rows={courses.map((c) => ({
              id: c.id,
              cells: [
                c.name,
                c.type,
                c.isActive ? (
                  <Badge key={`${c.id}-active`}>Attivo</Badge>
                ) : (
                  <Badge key={`${c.id}-arch`} variant="outline">
                    Archiviato
                  </Badge>
                ),
                daysAgo(c.deletedAt),
              ],
              label: c.name,
              kind: "course" as const,
              confirmExpected: c.name,
              confirmKind: "name" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <CestinoTable
            empty="Nessuna spesa eliminata."
            columns={["Tipo", "Importo", "Data", "Descrizione", "Eliminata"]}
            rows={expenses.map((e) => ({
              id: e.id,
              cells: [
                e.type,
                euroFormatter.format(e.amountCents / 100),
                formatDateShort(new Date(e.expenseDate)),
                e.description ?? "—",
                daysAgo(e.deletedAt),
              ],
              label: `${e.type} · ${euroFormatter.format(e.amountCents / 100)} · ${formatDateShort(new Date(e.expenseDate))}`,
              kind: "expense" as const,
              confirmExpected: new Date(e.expenseDate)
                .toISOString()
                .slice(0, 10),
              confirmKind: "date" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>

        <TabsContent value="certs">
          <CestinoTable
            empty="Nessun certificato eliminato."
            columns={["Allieva", "Tipo", "Emesso", "Scade", "Eliminato"]}
            rows={certs.map((c) => ({
              id: c.id,
              cells: [
                `${c.athlete.lastName} ${c.athlete.firstName}`,
                MEDICAL_CERT_TYPE_LABELS[normalizeCertType(c.type)],
                formatDateShort(new Date(c.issueDate)),
                formatDateShort(new Date(c.expiryDate)),
                daysAgo(c.deletedAt),
              ],
              label: `${c.athlete.firstName} ${c.athlete.lastName} · ${MEDICAL_CERT_TYPE_LABELS[normalizeCertType(c.type)]}`,
              kind: "cert" as const,
              confirmExpected: `${c.athlete.firstName} ${c.athlete.lastName}`,
              confirmKind: "name" as const,
            }))}
            onRestore={setConfirm}
            onHardDelete={setHardTarget}
          />
        </TabsContent>
      </Tabs>

      <HardDeleteDialog
        target={hardTarget}
        onClose={() => setHardTarget(null)}
      />

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ripristinare {confirm?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;elemento tornerà visibile nelle liste principali.
              L&apos;eliminazione definitiva (GDPR) sarà disponibile in una
              fase successiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRestore}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ripristino...
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Ripristina
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type CestinoRow = {
  id: string
  cells: React.ReactNode[]
  label: string
  kind: EntityKind
  confirmExpected: string
  confirmKind: "name" | "date"
}

function CestinoTable({
  columns,
  rows,
  empty,
  onRestore,
  onHardDelete,
}: {
  columns: string[]
  rows: CestinoRow[]
  empty: string
  onRestore: (target: ConfirmTarget) => void
  onHardDelete: (target: HardDeleteTarget) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    )
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
            <TableHead className="w-64 text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.cells.map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onRestore({
                        id: row.id,
                        label: row.label,
                        kind: row.kind,
                      })
                    }
                  >
                    <ArchiveRestore className="mr-1 h-4 w-4" />
                    Ripristina
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      onHardDelete({
                        id: row.id,
                        kind: row.kind,
                        label: row.label,
                        confirmExpected: row.confirmExpected,
                        confirmKind: row.confirmKind,
                      })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Elimina
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function HardDeleteDialog({
  target,
  onClose,
}: {
  target: HardDeleteTarget | null
  onClose: () => void
}) {
  const [step, setStep] = React.useState<"warn" | "confirm">("warn")
  const [input, setInput] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (target) {
      setStep("warn")
      setInput("")
      setBusy(false)
    }
  }, [target])

  if (!target) return null

  const expected = target.confirmExpected
  const matches =
    target.confirmKind === "name"
      ? input.trim().replace(/\s+/g, " ").toLowerCase() ===
        expected.trim().replace(/\s+/g, " ").toLowerCase()
      : input.trim() === expected

  const promptLabel =
    target.confirmKind === "name"
      ? `Per confermare scrivi: ${expected}`
      : `Per confermare scrivi la data (${expected})`

  async function onSubmit() {
    if (!matches || !target) return
    setBusy(true)
    const fn = HARD_DELETE_FN[target.kind]
    const result = await fn(target.id, input)
    if (result.ok) {
      toast.success(`${target.label} eliminato definitivamente`)
      onClose()
    } else {
      toast.error(result.error ?? "Errore eliminazione")
    }
    setBusy(false)
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent>
        {step === "warn" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Eliminare PERMANENTEMENTE {target.label}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è{" "}
                <strong>irreversibile</strong>. Tutti i dati collegati
                (iscrizioni, presenze, certificati, file allegati) verranno
                cancellati. I record con dati fiscali (pagamenti, compensi)
                bloccheranno l&apos;eliminazione per compliance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  setStep("confirm")
                }}
              >
                Continua
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>{promptLabel}</AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={expected}
              autoFocus
              disabled={busy}
              autoComplete="off"
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                disabled={!matches || busy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  onSubmit()
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina definitivamente
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
