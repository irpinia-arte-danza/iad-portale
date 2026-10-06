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
import { EmptyState } from "@/components/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { firstCategoryWithItems } from "@/lib/cestino/categories"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { fullName, listName } from "@/lib/utils/person-name"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
} from "@/lib/schemas/medical-certificate"

import {
  hardDeleteAthlete,
  hardDeleteCourse,
  hardDeleteExpense,
  hardDeleteAffiliationCard,
  hardDeleteEnrollment,
  hardDeleteMedicalCertificate,
  hardDeleteParent,
  hardDeleteTeacher,
  restoreAthlete,
  restoreCostume,
  restoreCourse,
  restoreExpense,
  restoreAffiliationCard,
  restoreEnrollment,
  restoreMedicalCertificate,
  restoreParent,
  restoreShowcase,
  restoreTeacher,
} from "../actions"

type EntityKind =
  | "athlete"
  | "parent"
  | "teacher"
  | "course"
  | "expense"
  | "cert"
  | "card"
  | "enrollment"
  | "showcase"
  | "costume"

type HardDeleteTarget = {
  id: string
  kind: EntityKind
  label: string
  confirmExpected: string
  confirmKind: "name" | "date"
}

type HardDeleteFn = (
  id: string,
  confirm: string,
) => Promise<{ ok: boolean; error?: string }>

const HARD_DELETE_FN: Partial<Record<EntityKind, HardDeleteFn>> = {
  athlete: hardDeleteAthlete,
  parent: hardDeleteParent,
  teacher: hardDeleteTeacher,
  course: hardDeleteCourse,
  expense: hardDeleteExpense,
  cert: hardDeleteMedicalCertificate,
  card: hardDeleteAffiliationCard,
  enrollment: hardDeleteEnrollment,
}

type Counts = {
  athletes: number
  parents: number
  teachers: number
  courses: number
  expenses: number
  certs: number
  cards: number
  enrollments: number
  showcases: number
  costumes: number
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
type ShowcaseRow = {
  id: string
  title: string
  date: Date
  deletedAt: Date | null
  academicYear: { id: string; label: string }
}
type CostumeRow = {
  id: string
  name: string
  costCents: number
  deletedAt: Date | null
  showcase: { id: string; title: string; deletedAt: Date | null }
}

type CardRow = {
  id: string
  entity: string
  cardNumber: string | null
  cardYear: number
  expiryDate: Date | null
  deletedAt: Date | null
  athlete: { id: string; firstName: string; lastName: string }
}

type EnrollmentRow = {
  id: string
  enrollmentDate: Date
  withdrawalDate: Date | null
  deletedAt: Date | null
  course: { name: string }
  academicYear: { label: string }
  athlete: { id: string; firstName: string; lastName: string }
  _count: { paymentSchedules: number }
}

type Props = {
  counts: Counts
  athletes: Athlete[]
  parents: Parent[]
  teachers: Teacher[]
  courses: CourseRow[]
  expenses: ExpenseRow[]
  certs: CertRow[]
  cards: CardRow[]
  enrollments: EnrollmentRow[]
  showcases: ShowcaseRow[]
  costumes: CostumeRow[]
}


function daysAgo(date: Date | null): string {
  if (!date) return "—"
  const ms = Date.now() - new Date(date).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days <= 0) return "oggi"
  if (days === 1) return "1 giorno fa"
  return `${days} giorni fa`
}

type Category = {
  key: string
  label: string
  count: number
  emptyTitle: string
  columns: string[]
  rows: CestinoRow[]
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
  card: restoreAffiliationCard,
  enrollment: restoreEnrollment,
  showcase: restoreShowcase,
  costume: restoreCostume,
} as const

export function CestinoClient({
  counts,
  athletes,
  parents,
  teachers,
  courses,
  expenses,
  certs,
  cards,
  enrollments,
  showcases,
  costumes,
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

  // ── Le categorie, come dati ─────────────────────────────────────────────
  // Erano dieci blocchi copiati: aggiungerne una voleva dire toccare la
  // lista delle schede e il contenuto, e sbagliare l'ordine in uno dei due.
  const categories: Category[] = [
    {
      key: "athletes",
      label: "Allieve",
      count: counts.athletes,
      emptyTitle: "Nessuna allieva nel cestino",
      columns: ["Nome", "C.F.", "Eliminata"],
      rows: athletes.map((a) => ({
        id: a.id,
        cells: [listName(a), a.fiscalCode ?? "—", daysAgo(a.deletedAt)],
        label: fullName(a),
        kind: "athlete",
        confirmExpected: fullName(a),
        confirmKind: "name",
      })),
    },
    {
      key: "parents",
      label: "Genitori",
      count: counts.parents,
      emptyTitle: "Nessun genitore nel cestino",
      columns: ["Nome", "Email", "Eliminato"],
      rows: parents.map((p) => ({
        id: p.id,
        cells: [listName(p), p.email ?? "—", daysAgo(p.deletedAt)],
        label: fullName(p),
        kind: "parent",
        confirmExpected: fullName(p),
        confirmKind: "name",
      })),
    },
    {
      key: "teachers",
      label: "Insegnanti",
      count: counts.teachers,
      emptyTitle: "Nessuna insegnante nel cestino",
      columns: ["Nome", "Email", "Eliminato"],
      rows: teachers.map((t) => ({
        id: t.id,
        cells: [listName(t), t.email ?? "—", daysAgo(t.deletedAt)],
        label: fullName(t),
        kind: "teacher",
        confirmExpected: fullName(t),
        confirmKind: "name",
      })),
    },
    {
      key: "courses",
      label: "Corsi",
      count: counts.courses,
      emptyTitle: "Nessun corso nel cestino",
      columns: ["Nome", "Tipo", "Stato", "Eliminato"],
      rows: courses.map((c) => ({
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
        kind: "course",
        confirmExpected: c.name,
        confirmKind: "name",
      })),
    },
    {
      key: "expenses",
      label: "Spese",
      count: counts.expenses,
      emptyTitle: "Nessuna spesa nel cestino",
      columns: ["Tipo", "Importo", "Data", "Descrizione", "Eliminata"],
      rows: expenses.map((e) => ({
        id: e.id,
        cells: [
          e.type,
          formatEuro(e.amountCents),
          formatDateShort(new Date(e.expenseDate)),
          e.description ?? "—",
          daysAgo(e.deletedAt),
        ],
        label: `${e.type} · ${formatEuro(e.amountCents)} · ${formatDateShort(new Date(e.expenseDate))}`,
        kind: "expense",
        confirmExpected: new Date(e.expenseDate).toISOString().slice(0, 10),
        confirmKind: "date",
      })),
    },
    {
      key: "certs",
      label: "Certificati",
      count: counts.certs,
      emptyTitle: "Nessun certificato nel cestino",
      columns: ["Allieva", "Tipo", "Emesso", "Scade", "Eliminato"],
      rows: certs.map((c) => ({
        id: c.id,
        cells: [
          listName(c.athlete),
          MEDICAL_CERT_TYPE_LABELS[normalizeCertType(c.type)],
          formatDateShort(new Date(c.issueDate)),
          formatDateShort(new Date(c.expiryDate)),
          daysAgo(c.deletedAt),
        ],
        label: `${fullName(c.athlete)} · ${MEDICAL_CERT_TYPE_LABELS[normalizeCertType(c.type)]}`,
        kind: "cert",
        confirmExpected: fullName(c.athlete),
        confirmKind: "name",
      })),
    },
    {
      key: "cards",
      label: "Tessere",
      count: counts.cards,
      emptyTitle: "Nessuna tessera nel cestino",
      columns: ["Allieva", "Ente", "Numero", "Anno", "Scade", "Eliminata"],
      rows: cards.map((c) => ({
        id: c.id,
        cells: [
          listName(c.athlete),
          c.entity,
          c.cardNumber ?? "—",
          String(c.cardYear),
          c.expiryDate ? formatDateShort(new Date(c.expiryDate)) : "—",
          daysAgo(c.deletedAt),
        ],
        label: `${fullName(c.athlete)} · tessera ${c.entity} n. ${c.cardNumber ?? "—"}`,
        kind: "card",
        confirmExpected: fullName(c.athlete),
        confirmKind: "name",
      })),
    },
    {
      key: "enrollments",
      label: "Iscrizioni",
      count: counts.enrollments,
      emptyTitle: "Nessuna iscrizione nel cestino",
      columns: ["Allieva", "Corso", "Anno", "Rate", "Annullata"],
      rows: enrollments.map((e) => ({
        id: e.id,
        cells: [
          listName(e.athlete),
          e.course.name,
          e.academicYear.label,
          String(e._count.paymentSchedules),
          daysAgo(e.deletedAt),
        ],
        label: `${fullName(e.athlete)} · ${e.course.name}`,
        kind: "enrollment",
        confirmExpected: fullName(e.athlete),
        confirmKind: "name",
      })),
    },
    {
      key: "showcases",
      label: "Saggi",
      count: counts.showcases,
      emptyTitle: "Nessun saggio nel cestino",
      columns: ["Saggio", "AA", "Data", "Eliminato"],
      rows: showcases.map((s) => ({
        id: s.id,
        cells: [
          s.title,
          s.academicYear.label,
          formatDateShort(new Date(s.date)),
          daysAgo(s.deletedAt),
        ],
        label: s.title,
        kind: "showcase",
        confirmExpected: s.title,
        confirmKind: "name",
      })),
    },
    {
      key: "costumes",
      label: "Costumi",
      count: counts.costumes,
      emptyTitle: "Nessun costume nel cestino",
      columns: ["Costume", "Saggio", "Costo", "Eliminato"],
      rows: costumes.map((c) => ({
        id: c.id,
        cells: [
          c.name,
          c.showcase.title + (c.showcase.deletedAt ? " (cestinato)" : ""),
          formatEuro(c.costCents),
          daysAgo(c.deletedAt),
        ],
        label: c.name,
        kind: "costume",
        confirmExpected: c.name,
        confirmKind: "name",
      })),
    },
  ]

  // Si apre sulla prima categoria che ha qualcosa: prima si apriva sempre
  // su Allieve, quasi sempre vuota, e il cestino sembrava vuoto anche
  // quando non lo era
  const firstWithItems = firstCategoryWithItems(categories)
  const [chosen, setChosen] = React.useState<string | null>(null)
  const active = chosen ?? firstWithItems ?? categories[0].key

  // Vuoto del tutto: una sola cosa da dire, non dieci schede vuote
  if (firstWithItems === null) {
    return (
      <EmptyState
        icon={Trash2}
        title="Il cestino è vuoto"
        description="Quello che elimini finisce qui e si può ripristinare"
      />
    )
  }

  const label = (c: Category) =>
    c.count > 0 ? `${c.label} (${c.count})` : c.label

  return (
    <>
      <Tabs value={active} onValueChange={setChosen} className="space-y-4">
        {/* Sotto 1024 dieci schede non ci stanno su una riga e andavano a
            capo su quattro: lì diventano una select, con gli stessi numeri */}
        <Select value={active} onValueChange={setChosen}>
          <SelectTrigger
            className="h-11 w-full lg:hidden"
            aria-label="Categoria del cestino"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {label(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <TabsList className="hidden h-auto flex-wrap justify-start lg:flex">
          {categories.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {label(c)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            <CestinoTable
              emptyTitle={c.emptyTitle}
              columns={c.columns}
              rows={c.rows}
              onRestore={setConfirm}
              onHardDelete={setHardTarget}
            />
          </TabsContent>
        ))}
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

const RESTORE_ONLY_KINDS = new Set<EntityKind>(["showcase", "costume"])

function CestinoTable({
  columns,
  rows,
  emptyTitle,
  onRestore,
  onHardDelete,
}: {
  columns: string[]
  rows: CestinoRow[]
  emptyTitle: string
  onRestore: (target: ConfirmTarget) => void
  onHardDelete: (target: HardDeleteTarget) => void
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title={emptyTitle}
        description="Quello che elimini finisce qui e si può ripristinare"
      />
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
                  {RESTORE_ONLY_KINDS.has(row.kind) ? null : (
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
                  )}
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
    if (!fn) {
      setBusy(false)
      toast.error("Eliminazione definitiva non disponibile per questo elemento")
      return
    }
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
