"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

import { createConsent } from "../consent-actions"

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
  "Il modulo firmato resta in archivio: qui si segna che c'è, quando e da chi."

export function ConsentFormDialog({
  open,
  onOpenChange,
  athleteId,
  kind,
  signers,
}: Props) {
  const [busy, setBusy] = React.useState(false)
  // Sotto 1024 il modulo sale dal basso: è il gesto di iPad e telefono
  const belowLg = useIsBelowLg()

  const defaults = React.useCallback(
    (): ConsentValues => ({
      kind,
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

  async function onSubmit(values: ConsentValues) {
    setBusy(true)
    const result = await createConsent(athleteId, values)
    if (result.ok) {
      toast.success(`${CONSENT_KIND_LABELS[values.kind]}: consenso registrato`)
      onOpenChange(false)
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
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consenso</FormLabel>
              <div
                role="radiogroup"
                aria-label="Tipo di consenso"
                className="grid gap-2"
              >
                {CONSENT_KINDS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={field.value === k}
                    variant={field.value === k ? "default" : "outline"}
                    className="h-11 justify-start whitespace-normal text-left leading-tight"
                    onClick={() => field.onChange(k)}
                  >
                    {CONSENT_KIND_LABELS[k]}
                  </Button>
                ))}
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
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            className="h-11"
            disabled={busy || signers.length === 0}
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
      <Sheet open={open} onOpenChange={onOpenChange}>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
