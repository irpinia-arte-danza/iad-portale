"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Shirt,
  Trash2,
  X,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  assignCostume,
  createCostume,
  softDeleteCostume,
  unassignCostume,
  updateAssignmentSize,
  updateCostume,
} from "../../costume-actions"
import type { CostumeWithAssignments, ShowcaseWithDetails } from "../../queries"

const EUR = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

type Props = {
  showcaseId: string
  costumes: CostumeWithAssignments[]
  participations: ShowcaseWithDetails["participations"]
}

type CostumeRow = CostumeWithAssignments
type AssignmentRow = CostumeRow["assignments"][number]
type ParticipationRow = ShowcaseWithDetails["participations"][number]

export function ShowcaseCostumesTab({
  showcaseId,
  costumes,
  participations,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CostumeRow | null>(null)
  const [assignTarget, setAssignTarget] = useState<CostumeRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const totalAssignments = costumes.reduce(
    (sum, c) => sum + c.assignments.length,
    0,
  )
  const totalPaid = costumes.reduce(
    (sum, c) => sum + c.assignments.filter((a) => a.paid).length,
    0,
  )

  function onDeleteCostume(c: CostumeRow) {
    setBusyId(c.id)
    startTransition(async () => {
      const res = await softDeleteCostume(c.id)
      setBusyId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Costume cestinato")
        router.refresh()
      }
    })
  }

  function onUnassign(a: AssignmentRow) {
    setBusyId(a.id)
    startTransition(async () => {
      const res = await unassignCostume(a.id)
      setBusyId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Assegnazione rimossa")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>
            <span className="font-mono font-medium text-foreground">
              {costumes.length}
            </span>{" "}
            costumi
          </span>
          <span>·</span>
          <span>
            <span className="font-mono font-medium text-foreground">
              {totalAssignments}
            </span>{" "}
            assegnazioni
          </span>
          <span>·</span>
          <span>
            <span className="font-mono font-medium text-foreground">
              {totalPaid}/{totalAssignments}
            </span>{" "}
            pagate
          </span>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Aggiungi costume
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo costume</DialogTitle>
              <DialogDescription>
                Aggiungi un costume al saggio. Potrai assegnarlo alle
                partecipanti in seguito.
              </DialogDescription>
            </DialogHeader>
            <CostumeForm
              mode="create"
              showcaseId={showcaseId}
              onDone={() => {
                setCreateOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {costumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Shirt className="h-8 w-8 text-muted-foreground/50" />
            <p>Nessun costume configurato per questo saggio.</p>
            <p className="text-xs">
              Clicca «Aggiungi costume» per iniziare.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {costumes.map((c) => (
            <CostumeCard
              key={c.id}
              costume={c}
              participations={participations}
              busyId={busyId}
              isPending={isPending}
              onEdit={() => setEditTarget(c)}
              onAssign={() => setAssignTarget(c)}
              onDelete={() => onDeleteCostume(c)}
              onUnassign={onUnassign}
              onRefresh={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {editTarget ? (
        <Dialog
          open={editTarget !== null}
          onOpenChange={(open) => !open && setEditTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica costume</DialogTitle>
              <DialogDescription>
                Aggiorna nome, descrizione e costo del costume.
              </DialogDescription>
            </DialogHeader>
            <CostumeForm
              mode="edit"
              costumeId={editTarget.id}
              defaultValues={{
                name: editTarget.name,
                description: editTarget.description ?? "",
                costEur: editTarget.costCents / 100,
              }}
              onDone={() => {
                setEditTarget(null)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {assignTarget ? (
        <AssignDialog
          costume={assignTarget}
          participations={participations}
          onClose={() => setAssignTarget(null)}
          onDone={() => {
            setAssignTarget(null)
            router.refresh()
          }}
        />
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// CostumeCard
// ─────────────────────────────────────────────────────────────────────────

function CostumeCard({
  costume,
  busyId,
  isPending,
  onEdit,
  onAssign,
  onDelete,
  onUnassign,
  onRefresh,
}: {
  costume: CostumeRow
  participations: ShowcaseWithDetails["participations"]
  busyId: string | null
  isPending: boolean
  onEdit: () => void
  onAssign: () => void
  onDelete: () => void
  onUnassign: (a: AssignmentRow) => void
  onRefresh: () => void
}) {
  const assignmentCount = costume.assignments.length
  const paidCount = costume.assignments.filter((a) => a.paid).length
  const isFree = costume.costCents === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shirt className="h-4 w-4 text-pink-500" />
            {costume.name}
            {isFree ? (
              <Badge variant="outline" className="text-xs">
                Incluso
              </Badge>
            ) : null}
          </CardTitle>
          {costume.description ? (
            <p className="text-xs text-muted-foreground">{costume.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono text-sm font-medium">
              {EUR.format(costume.costCents / 100)}
            </div>
            <div className="text-xs text-muted-foreground">
              {assignmentCount > 0
                ? `${paidCount}/${assignmentCount} pagate`
                : "Nessuna assegnazione"}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending && busyId === costume.id}
                >
                  {isPending && busyId === costume.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cestinare il costume?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Il costume sarà cestinato (soft delete). Operazione
                    reversibile dal Cestino. Bloccato se ci sono ancora
                    assegnazioni: rimuovile prima.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Cestina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between pb-3">
          <span className="text-xs text-muted-foreground">
            Assegnazioni ({assignmentCount})
          </span>
          <Button size="sm" variant="outline" onClick={onAssign}>
            <Plus className="h-3 w-3" />
            Assegna
          </Button>
        </div>
        {assignmentCount === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Nessuna partecipante assegnata
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partecipante</TableHead>
                  <TableHead className="w-32">Taglia</TableHead>
                  <TableHead className="w-28">Stato</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costume.assignments.map((a) => (
                  <AssignmentRowView
                    key={a.id}
                    assignment={a}
                    busyId={busyId}
                    isPending={isPending}
                    onUnassign={() => onUnassign(a)}
                    onRefresh={onRefresh}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// AssignmentRowView (with inline size edit)
// ─────────────────────────────────────────────────────────────────────────

function AssignmentRowView({
  assignment,
  busyId,
  isPending,
  onUnassign,
  onRefresh,
}: {
  assignment: AssignmentRow
  busyId: string | null
  isPending: boolean
  onUnassign: () => void
  onRefresh: () => void
}) {
  const [editingSize, setEditingSize] = useState(false)
  const [sizeValue, setSizeValue] = useState(assignment.size ?? "")
  const [savingSize, startSaveSize] = useTransition()

  function saveSize() {
    startSaveSize(async () => {
      const res = await updateAssignmentSize({
        assignmentId: assignment.id,
        size: sizeValue,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Taglia aggiornata")
        setEditingSize(false)
        onRefresh()
      }
    })
  }

  const athleteName = `${assignment.participation.athlete.firstName} ${assignment.participation.athlete.lastName}`

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{athleteName}</div>
        {!assignment.participation.confirmed ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Non confermata
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        {editingSize ? (
          <div className="flex items-center gap-1">
            <Input
              value={sizeValue}
              onChange={(e) => setSizeValue(e.target.value)}
              placeholder="es. M"
              className="h-7 w-20 text-xs"
              disabled={savingSize}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={saveSize}
              disabled={savingSize}
            >
              {savingSize ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="text-xs">✓</span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setSizeValue(assignment.size ?? "")
                setEditingSize(false)
              }}
              disabled={savingSize}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingSize(true)}
            className="text-sm hover:underline"
          >
            {assignment.size ?? (
              <span className="text-muted-foreground italic">imposta</span>
            )}
          </button>
        )}
      </TableCell>
      <TableCell>
        {assignment.paid ? (
          <Badge className="bg-emerald-600">Pagato</Badge>
        ) : assignment.paymentSchedule ? (
          <Badge variant="outline">In attesa</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Gratis
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={isPending && busyId === assignment.id}
            >
              {isPending && busyId === assignment.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rimuovere assegnazione?</AlertDialogTitle>
              <AlertDialogDescription>
                L&apos;assegnazione del costume sarà rimossa, insieme alla
                scadenza pagamento se non saldata. Bloccato se il pagamento è
                già registrato.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={onUnassign}>
                Rimuovi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// CostumeForm (create/edit)
// ─────────────────────────────────────────────────────────────────────────

function CostumeForm({
  mode,
  showcaseId,
  costumeId,
  defaultValues,
  onDone,
}: {
  mode: "create" | "edit"
  showcaseId?: string
  costumeId?: string
  defaultValues?: { name: string; description: string; costEur: number }
  onDone: () => void
}) {
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  )
  const [costEur, setCostEur] = useState(defaultValues?.costEur ?? 0)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res =
        mode === "create" && showcaseId
          ? await createCostume({ showcaseId, name, description, costEur })
          : costumeId
            ? await updateCostume(costumeId, { name, description, costEur })
            : { ok: false as const, error: "Modalità non valida" }
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(mode === "create" ? "Costume creato" : "Costume aggiornato")
        onDone()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Tutù rosa, Body nero, Cappellino"
          required
          minLength={2}
          maxLength={120}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label>Descrizione (opzionale)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Note, materiali, dettagli…"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label>Costo (€)</Label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={costEur === 0 ? "" : costEur}
          onChange={(e) =>
            setCostEur(e.target.value === "" ? 0 : parseFloat(e.target.value))
          }
          placeholder="0 = incluso/gratis"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Costo 0 = costume incluso/gratis: non viene generata scadenza pagamento.
        </p>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvataggio…
            </>
          ) : mode === "create" ? (
            "Crea costume"
          ) : (
            "Salva modifiche"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// AssignDialog
// ─────────────────────────────────────────────────────────────────────────

function AssignDialog({
  costume,
  participations,
  onClose,
  onDone,
}: {
  costume: CostumeRow
  participations: ShowcaseWithDetails["participations"]
  onClose: () => void
  onDone: () => void
}) {
  const [participationId, setParticipationId] = useState("")
  const [size, setSize] = useState("")
  const [isPending, startTransition] = useTransition()

  const assignedIds = useMemo(
    () => new Set(costume.assignments.map((a) => a.participation.id)),
    [costume.assignments],
  )

  // Mostra solo partecipazioni non già assegnate a questo costume
  const candidates = useMemo(
    () => participations.filter((p) => !assignedIds.has(p.id)),
    [participations, assignedIds],
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!participationId) {
      toast.error("Seleziona una partecipante")
      return
    }
    startTransition(async () => {
      const res = await assignCostume({
        costumeId: costume.id,
        participationId,
        size,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Costume assegnato")
        onDone()
      }
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assegna «{costume.name}»</DialogTitle>
          <DialogDescription>
            Seleziona partecipante e indica la taglia.
            {costume.costCents > 0 ? (
              <>
                {" "}
                Verrà generata una scadenza pagamento da{" "}
                <span className="font-medium">
                  {EUR.format(costume.costCents / 100)}
                </span>
                .
              </>
            ) : (
              <>
                {" "}
                Costume gratuito: nessuna scadenza pagamento generata.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Partecipante</Label>
            {candidates.length === 0 ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Tutte le partecipanti hanno già questo costume assegnato.
              </p>
            ) : (
              <Select value={participationId} onValueChange={setParticipationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli partecipante" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((p) => {
                    const label = `${p.athlete.firstName} ${p.athlete.lastName}${p.confirmed ? "" : " (non confermata)"}`
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Taglia (opzionale)</Label>
            <Input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="es. M, 42, bimba 8 anni"
              maxLength={50}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isPending || candidates.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assegnazione…
                </>
              ) : (
                "Assegna"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
