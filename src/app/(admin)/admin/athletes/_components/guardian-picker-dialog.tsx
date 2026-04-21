"use client"

import { useEffect, useState, useTransition } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { ParentRelationship } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  guardianRelationSchema,
  type GuardianRelationValues,
} from "@/lib/schemas/guardian"
import {
  linkExistingGuardian,
  linkNewGuardian,
  searchParentsForLinking,
} from "../guardians-actions"
import { GuardianRelationFields } from "./guardian-relation-fields"

type ExistingGuardian = {
  id: string
  firstName: string
  lastName: string
  isPrimaryContact: boolean
  isPrimaryPayer: boolean
}

interface GuardianPickerDialogProps {
  athleteId: string
  existingGuardians: ExistingGuardian[]
  onSuccess?: () => void
}

function fullName(g: ExistingGuardian) {
  return `${g.firstName} ${g.lastName}`
}

const linkExistingSchema = z.object({
  parentId: z.string().uuid("Seleziona un genitore"),
  ...guardianRelationSchema.shape,
})

const linkNewSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio"),
  lastName: z.string().trim().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  ...guardianRelationSchema.shape,
})

type LinkExistingValues = z.infer<typeof linkExistingSchema>
type LinkNewValues = z.infer<typeof linkNewSchema>

type ParentSearchResult = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  _count: { athleteRelations: number }
}

export function GuardianPickerDialog({
  athleteId,
  existingGuardians,
  onSuccess,
}: GuardianPickerDialogProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"existing" | "new">("existing")

  const lockedPrimaryContact = existingGuardians.find((g) => g.isPrimaryContact)
  const lockedPrimaryPayer = existingGuardians.find((g) => g.isPrimaryPayer)

  const isFirstGuardian = existingGuardians.length === 0
  const defaultRelation: GuardianRelationValues = {
    relationship: ParentRelationship.MOTHER,
    isPrimaryContact: isFirstGuardian && !lockedPrimaryContact,
    isPrimaryPayer: isFirstGuardian && !lockedPrimaryPayer,
    isPickupAuthorized: true,
    hasParentalAuthority: true,
  }

  const lockedPrimaryContactName = lockedPrimaryContact
    ? fullName(lockedPrimaryContact)
    : null
  const lockedPrimaryPayerName = lockedPrimaryPayer
    ? fullName(lockedPrimaryPayer)
    : null

  function handleSuccess() {
    setOpen(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Collega genitore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Collega genitore o tutore</DialogTitle>
          <DialogDescription>
            Scegli un genitore già esistente o creane uno nuovo da collegare
            all&apos;allieva.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "existing" | "new")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">
              <Search className="h-4 w-4 mr-2" />
              Esistente
            </TabsTrigger>
            <TabsTrigger value="new">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuovo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <ExistingParentForm
              athleteId={athleteId}
              defaultRelation={defaultRelation}
              lockedPrimaryContactName={lockedPrimaryContactName}
              lockedPrimaryPayerName={lockedPrimaryPayerName}
              onSuccess={handleSuccess}
            />
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <NewParentForm
              athleteId={athleteId}
              defaultRelation={defaultRelation}
              lockedPrimaryContactName={lockedPrimaryContactName}
              lockedPrimaryPayerName={lockedPrimaryPayerName}
              onSuccess={handleSuccess}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ExistingParentForm({
  athleteId,
  defaultRelation,
  lockedPrimaryContactName,
  lockedPrimaryPayerName,
  onSuccess,
}: {
  athleteId: string
  defaultRelation: GuardianRelationValues
  lockedPrimaryContactName: string | null
  lockedPrimaryPayerName: string | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ParentSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const form = useForm<LinkExistingValues>({
    resolver: zodResolver(linkExistingSchema),
    defaultValues: { parentId: "", ...defaultRelation },
  })

  const selectedParentId = form.watch("parentId")

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed.length === 0) {
      setResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      const data = await searchParentsForLinking(athleteId, trimmed)
      setResults(data)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, athleteId])

  function onSubmit(values: LinkExistingValues) {
    const { parentId, ...relation } = values
    startTransition(async () => {
      const result = await linkExistingGuardian(athleteId, parentId, relation)
      if (result.ok) {
        toast.success("Genitore collegato")
        form.reset()
        setSearch("")
        setResults([])
        onSuccess()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <FormLabel>Cerca genitore</FormLabel>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, cognome o email..."
            autoComplete="off"
          />
          {isSearching && (
            <p className="text-xs text-muted-foreground">Ricerca in corso...</p>
          )}
          {!isSearching &&
            search.trim().length > 0 &&
            results.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessun genitore trovato. Prova con il tab &quot;Nuovo&quot;.
              </p>
            )}
          {results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-md border">
              {results.map((p) => {
                const isSelected = selectedParentId === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue("parentId", p.id, {
                          shouldValidate: true,
                        })
                      }
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        isSelected ? "bg-muted" : ""
                      }`}
                    >
                      <div className="font-medium">
                        {p.lastName} {p.firstName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.email || "—"} · {p._count.athleteRelations}{" "}
                        {p._count.athleteRelations === 1
                          ? "allieva"
                          : "allieve"}{" "}
                        collegate
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <FormField
            control={form.control}
            name="parentId"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedParentId && (
          <>
            <Separator />
            <GuardianRelationFields
              lockedPrimaryContactName={lockedPrimaryContactName}
              lockedPrimaryPayerName={lockedPrimaryPayerName}
            />
            <div className="flex sm:justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Collegamento...
                  </>
                ) : (
                  "Collega genitore"
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </FormProvider>
  )
}

function NewParentForm({
  athleteId,
  defaultRelation,
  lockedPrimaryContactName,
  lockedPrimaryPayerName,
  onSuccess,
}: {
  athleteId: string
  defaultRelation: GuardianRelationValues
  lockedPrimaryContactName: string | null
  lockedPrimaryPayerName: string | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<LinkNewValues>({
    resolver: zodResolver(linkNewSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      ...defaultRelation,
    },
  })

  function onSubmit(values: LinkNewValues) {
    const { firstName, lastName, email, phone, ...relation } = values
    startTransition(async () => {
      const result = await linkNewGuardian(
        athleteId,
        { firstName, lastName, email, phone },
        relation
      )
      if (result.ok) {
        toast.success("Genitore creato e collegato")
        form.reset()
        onSuccess()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="given-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome *</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="family-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <GuardianRelationFields
          lockedPrimaryContactName={lockedPrimaryContactName}
          lockedPrimaryPayerName={lockedPrimaryPayerName}
        />

        <div className="flex sm:justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creazione...
              </>
            ) : (
              "Crea e collega"
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
