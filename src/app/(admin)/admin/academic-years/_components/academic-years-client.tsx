"use client"

import * as React from "react"
import {
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateShort } from "@/lib/utils/format"

import { setCurrentAcademicYear } from "../actions"
import { AcademicYearFormDialog } from "./academic-year-form-dialog"
import { StartNewYearDialog } from "./start-new-year-dialog"

type AYRow = {
  id: string
  label: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
  associationFeeCents: number
  monthlyRenewalDay: number
  _count: {
    enrollments: number
    payments: number
    lessons: number
  }
}

type Props = {
  years: AYRow[]
}

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

function deriveSuggestion(years: AYRow[]) {
  const current = years.find((y) => y.isCurrent)
  const reference =
    current ??
    [...years].sort(
      (a, b) => b.startDate.getTime() - a.startDate.getTime(),
    )[0] ??
    null

  if (!reference) {
    const now = new Date().getFullYear()
    return {
      label: `${now}-${now + 1}`,
      startDate: new Date(now, 8, 1), // 1 settembre
      endDate: new Date(now + 1, 7, 31), // 31 agosto
      feeEur: 0,
    }
  }

  const [start, end] = reference.label.split("-").map(Number)
  return {
    label: `${start + 1}-${end + 1}`,
    startDate: new Date(start + 1, 8, 1),
    endDate: new Date(end + 1, 7, 31),
    feeEur: reference.associationFeeCents / 100,
  }
}

export function AcademicYearsClient({ years }: Props) {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [startNewOpen, setStartNewOpen] = React.useState(false)
  const [makingCurrent, setMakingCurrent] = React.useState<AYRow | null>(null)
  const [busy, setBusy] = React.useState(false)

  const editing =
    editingId !== null ? years.find((y) => y.id === editingId) ?? null : null
  const current = years.find((y) => y.isCurrent) ?? null

  const suggestion = deriveSuggestion(years)
  const currentSummary = current
    ? {
        id: current.id,
        label: current.label,
        enrollmentsCount: current._count.enrollments,
        paymentsCount: current._count.payments,
        lessonsCount: current._count.lessons,
      }
    : null

  function openCreate() {
    setEditingId(null)
    setFormOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setFormOpen(true)
  }

  async function onConfirmSetCurrent() {
    if (!makingCurrent) return
    setBusy(true)
    const result = await setCurrentAcademicYear(makingCurrent.id)
    if (result.ok) {
      toast.success(`Anno ${makingCurrent.label} impostato come corrente`)
      setMakingCurrent(null)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      {!current ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Nessun anno accademico corrente
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Imposta un anno come corrente per abilitare iscrizioni, lezioni e
            pagamenti.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Nuovo anno
        </Button>
        <Button onClick={() => setStartNewOpen(true)}>
          <Sparkles className="mr-1 h-4 w-4" />
          Inizia nuovo anno accademico
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anno</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead className="hidden md:table-cell">Quota</TableHead>
              <TableHead className="hidden md:table-cell text-center">
                Iscrizioni
              </TableHead>
              <TableHead className="hidden lg:table-cell text-center">
                Lezioni
              </TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nessun anno accademico configurato.
                </TableCell>
              </TableRow>
            ) : (
              years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-mono">{y.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateShort(y.startDate)} –{" "}
                    {formatDateShort(y.endDate)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm">
                    {euroFormatter.format(y.associationFeeCents / 100)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {y._count.enrollments}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">
                    {y._count.lessons}
                  </TableCell>
                  <TableCell>
                    {y.isCurrent ? (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Corrente
                      </Badge>
                    ) : (
                      <Badge variant="outline">Storico</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Azioni anno"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(y.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        {!y.isCurrent ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setMakingCurrent(y)}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Imposta come corrente
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AcademicYearFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        yearId={editing?.id}
        defaults={
          editing
            ? {
                label: editing.label,
                startDate: new Date(editing.startDate),
                endDate: new Date(editing.endDate),
                associationFeeEur: editing.associationFeeCents / 100,
                monthlyRenewalDay: editing.monthlyRenewalDay,
              }
            : undefined
        }
      />

      <StartNewYearDialog
        open={startNewOpen}
        onOpenChange={setStartNewOpen}
        current={currentSummary}
        suggestedLabel={suggestion.label}
        suggestedStart={suggestion.startDate}
        suggestedEnd={suggestion.endDate}
        suggestedFeeEur={suggestion.feeEur}
      />

      <AlertDialog
        open={makingCurrent !== null}
        onOpenChange={(open) => {
          if (!open) setMakingCurrent(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Impostare {makingCurrent?.label} come anno corrente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le dashboard genitori e insegnanti mostreranno i dati di questo
              anno. L&apos;anno corrente attuale (se presente) verrà
              riclassificato come storico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmSetCurrent}
              disabled={busy}
            >
              {busy ? "Salvataggio..." : "Imposta come corrente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
