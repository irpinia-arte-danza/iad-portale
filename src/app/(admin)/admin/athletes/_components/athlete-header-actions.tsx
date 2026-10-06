"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react"
import { toast } from "sonner"
import type { FeeType, PaymentMethod } from "@prisma/client"

import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  AthleteForPDF,
  BrandForPDF,
} from "@/app/(admin)/admin/athletes/queries"
import { AthletePDFButton } from "../[id]/_components/athlete-pdf-button"

import { softDeleteAthlete } from "../actions"
import { AthleteEditDialog } from "./athlete-edit-dialog"
import { useOpenScheduleSettle } from "./schedule-settle-provider"

// ─────────────────────────────────────────────────────────────────────────
// Le azioni in testa alla scheda.
//
// Prima c'erano "Esporta PDF", "Modifica" ed "Elimina" tutti e tre con lo
// stesso peso: la prima azione proposta su una minorenne era esportarne i
// dati, e il tasto per cancellarla stava a un dito da quello per correggerla.
// Adesso in vista c'è solo quello che si fa tutti i giorni — incassare — e il
// resto sta nel menu, col cestino staccato e una conferma che ripete il nome.
// ─────────────────────────────────────────────────────────────────────────

type OpenSchedule = {
  id: string
  feeType: FeeType
  courseEnrollmentId: string | null
  courseName: string
  dueDate: Date
  amountCents: number
}

interface AthleteHeaderActionsProps {
  athlete: React.ComponentProps<typeof AthleteEditDialog>["athlete"]
  linkedParents: number
  pdf: { data: AthleteForPDF; brand: BrandForPDF | null } | null
  // Rate aperte: con una sola, "Incassa" la spunta già
  openSchedules: OpenSchedule[]
  lastMethod: PaymentMethod | null
}

export function AthleteHeaderActions({
  athlete,
  linkedParents,
  pdf,
  openSchedules,
  lastMethod,
}: AthleteHeaderActionsProps) {
  const router = useRouter()
  const openSettle = useOpenScheduleSettle()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const single = openSchedules.length === 1 ? openSchedules[0] : null

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteAthlete(athlete.id)
      if (result.ok) {
        toast.success("Allieva spostata nel cestino")
        router.push("/admin/athletes")
      } else {
        toast.error(result.error)
      }
    })
  }

  function incassa() {
    openSettle({
      // Con una rata sola è quella; con zero o più d'una si apre il form
      // sull'allieva e la scelta la fa Giuseppina
      id: single?.id ?? "",
      feeType: single?.feeType ?? "OTHER",
      courseEnrollmentId: single?.courseEnrollmentId ?? null,
      courseName: single?.courseName ?? "Pagamento",
      dueDate: single?.dueDate ?? new Date(),
      amountCents: single?.amountCents ?? 0,
      selection: single ? [{ id: single.id, amountCents: single.amountCents }] : [],
      athlete: {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
      },
      defaultMethod: lastMethod,
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button className="h-11" onClick={incassa}>
          <Wallet className="h-4 w-4" />
          Incassa
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="Altre azioni"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Modifica
            </DropdownMenuItem>
            {pdf ? (
              <DropdownMenuItem
                className="p-0"
                onSelect={(e) => e.preventDefault()}
              >
                <AthletePDFButton
                  data={pdf.data}
                  brand={pdf.brand}
                  variant="ghost"
                  label="Scheda PDF"
                  className="w-full justify-start font-normal"
                />
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Sposta nel cestino
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AthleteEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        athlete={athlete}
        linkedParents={linkedParents}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Spostare {athlete.firstName} {athlete.lastName} nel cestino?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {athlete.firstName} {athlete.lastName} sparisce dagli elenchi, ma
              non si perde niente: pagamenti, ricevute e storico restano, e dal
              Cestino si può ripristinare. I genitori collegati non vengono
              toccati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Spostamento…" : "Sposta nel cestino"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
