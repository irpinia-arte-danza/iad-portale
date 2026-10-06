"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useIsBelowLg } from "@/hooks/use-is-below-lg"
import {
  CONSENT_KIND_LABELS,
  CONSENT_KINDS,
  consentSchema,
  type ConsentKind,
  type ConsentValues,
} from "@/lib/schemas/consent"
import { toDateInputValue } from "@/lib/utils/format"

import { registerConsents } from "../consent-actions"
import { useConsentFilePicker } from "./consent-file-picker"

// Chi può aver firmato: i genitori collegati e, se maggiorenne, l'allieva
export type ConsentSigner = { value: string; label: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId: string
  // Il tipo con cui si apre: dalla riga «Registra» del consenso che manca
  kind: ConsentKind
  signers: ConsentSigner[]
}

const TITLE = "Registra un consenso cartaceo"
const DESCRIPTION =
  "Si segna quando è stato firmato e da chi. Il modulo si può allegare: foto o PDF."

export function ConsentFormDialog({
  open,
  onOpenChange,
  athleteId,
  kind,
  signers,
}: Props) {
  const [busy, setBusy] = React.useState(false)
  const picker = useConsentFilePicker(busy)
  // Sotto 1024 il modulo sale dal basso: è il gesto di iPad e telefono
  const belowLg = useIsBelowLg()

  const defaults = React.useCallback(
    (): ConsentValues => ({
      kinds: [kind],
      alsoFor: [],
      signedOn: new Date(),
      signedBy: signers[0]?.value ?? "",
      notes: "",
    }),
    [kind, signers],
  )

  const form = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: defaults(),
  })

  React.useEffect(() => {
    if (open) form.reset(defaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind])

  // Alla chiusura il file scelto si dimentica: alla prossima apertura il
  // dialog riparte vuoto
  function handleOpenChange(next: boolean) {
    if (!next) picker.reset()
    onOpenChange(next)
  }

  async function onSubmit(values: ConsentValues) {
    setBusy(true)
    const fd = new FormData()
    for (const k of values.kinds) fd.append("kinds", k)
    // Niente alsoFor: ogni sorella ha il proprio modulo, e si registra dalla
    // sua scheda. L'azione lo saprebbe fare, il dialog non lo propone.
    fd.append("signedOn", values.signedOn.toISOString())
    fd.append("signedBy", values.signedBy)
    if (values.notes) fd.append("notes", values.notes)
    if (picker.file) fd.append("file", picker.file)

    const result = await registerConsents(athleteId, fd)
    if (result.ok) {
      const n = result.data?.created ?? 1
      toast.success(
        n === 1 ? "Consenso registrato" : `${n} consensi registrati`,
      )
      handleOpenChange(false)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  const formBody = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Il foglio prima di tutto, come per il certificato */}
        {picker.element}

        <FormField
          control={form.control}
          name="kinds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consensi che il modulo copre</FormLabel>
              <div className="grid gap-1">
                {CONSENT_KINDS.map((k) => {
                  const checked = field.value.includes(k)
                  return (
                    <label
                      key={k}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          field.onChange(
                            next === true
                              ? [...field.value, k]
                              : field.value.filter((v) => v !== k),
                          )
                        }
                      />
                      {CONSENT_KIND_LABELS[k]}
                    </label>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="signedOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmato il</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="h-11"
                  max={toDateInputValue(new Date())}
                  value={field.value ? toDateInputValue(field.value) : ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="signedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmato da</FormLabel>
              {signers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  È minorenne e non ha genitori collegati: collega prima un
                  genitore, poi registra la firma.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Chi ha firmato"
                  className="grid gap-2"
                >
                  {signers.map((s) => (
                    <Button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === s.value}
                      variant={field.value === s.value ? "default" : "outline"}
                      className="h-11 justify-start whitespace-normal text-left leading-tight"
                      onClick={() => field.onChange(s.value)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  maxLength={500}
                  placeholder="es. modulo nel raccoglitore 2026/27"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            className="h-11"
            disabled={busy || picker.preparing || signers.length === 0}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Registra"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )

  // Lo stesso modulo in due cornici: dialog da 1024 in su, pannello dal
  // basso sotto. Non due moduli.
  if (belowLg) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto p-0"
        >
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{TITLE}</SheetTitle>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <div className="p-4">{formBody}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  )
}
