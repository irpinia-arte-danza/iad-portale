"use client"

import * as React from "react"
import { ArchiveRestore, Loader2 } from "lucide-react"
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
  restoreAthlete,
  restoreCourse,
  restoreExpense,
  restoreMedicalCertificate,
  restoreParent,
  restoreTeacher,
} from "../actions"

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
  kind: "athlete" | "parent" | "teacher" | "course" | "expense" | "cert"
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
            }))}
            onRestore={setConfirm}
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
            }))}
            onRestore={setConfirm}
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
            }))}
            onRestore={setConfirm}
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
            }))}
            onRestore={setConfirm}
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
              label: `${e.type} · ${euroFormatter.format(e.amountCents / 100)}`,
              kind: "expense" as const,
            }))}
            onRestore={setConfirm}
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
            }))}
            onRestore={setConfirm}
          />
        </TabsContent>
      </Tabs>

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

function CestinoTable({
  columns,
  rows,
  empty,
  onRestore,
}: {
  columns: string[]
  rows: Array<{
    id: string
    cells: React.ReactNode[]
    label: string
    kind: ConfirmTarget["kind"]
  }>
  empty: string
  onRestore: (target: ConfirmTarget) => void
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
            <TableHead className="w-32 text-right">Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.cells.map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
