"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import { brandSchema, type BrandValues } from "@/lib/schemas/admin-settings"

import { updateBrand } from "../actions"
import { LogoSlotUpload } from "./logo-slot-upload"
import { StickySaveBar } from "./sticky-save-bar"

interface BrandTabProps {
  initialColors: BrandValues
  initialLogos: {
    logoUrl: string | null
    logoDarkUrl: string | null
    logoSvgUrl: string | null
    faviconUrl: string | null
  }
  onDirtyChange: (dirty: boolean) => void
}

export function BrandTab({
  initialColors,
  initialLogos,
  onDirtyChange,
}: BrandTabProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<BrandValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: initialColors,
    mode: "onBlur",
  })

  const isDirty = form.formState.isDirty
  useBeforeUnloadGuard(isDirty)
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  function onSubmit(values: BrandValues) {
    startTransition(async () => {
      const res = await updateBrand(values)
      if (res.ok) {
        toast.success("Colori brand aggiornati")
        form.reset(values)
      } else {
        toast.error(res.error)
      }
    })
  }

  function onDiscard() {
    form.reset(initialColors)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loghi</CardTitle>
          <CardDescription>
            Carica i loghi dell&apos;ASD. Appaiono in dashboard, email e ricevute.
            Dimensione massima 2 MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <LogoSlotUpload
            slot="logo-light"
            title="Logo principale (tema chiaro)"
            description="Usato in header e ricevute"
            hint="PNG/JPG/WebP/SVG · Sfondo chiaro consigliato"
            initialUrl={initialLogos.logoUrl}
          />
          <LogoSlotUpload
            slot="logo-dark"
            title="Logo alternativo (tema scuro)"
            description="Visualizzato quando il tema dark è attivo"
            hint="PNG/JPG/WebP/SVG · Ottimizzato per sfondi scuri"
            initialUrl={initialLogos.logoDarkUrl}
          />
          <LogoSlotUpload
            slot="logo-svg"
            title="Logo vettoriale (PDF)"
            description="Versione ad alta risoluzione per ricevute PDF"
            hint="SVG vettoriale consigliato"
            initialUrl={initialLogos.logoSvgUrl}
          />
          <LogoSlotUpload
            slot="favicon"
            title="Favicon"
            description="Icona mostrata nella tab del browser"
            hint="PNG/SVG/ICO 32×32 o 64×64"
            initialUrl={initialLogos.faviconUrl}
            previewClassName="h-24"
          />
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Colori</CardTitle>
              <CardDescription>
                Colore primario (accent) e secondario, usati in UI e ricevute.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore primario</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-10 w-14 cursor-pointer rounded border"
                        />
                      </FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="#171717"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore secondario</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-10 w-14 cursor-pointer rounded border"
                        />
                      </FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="#737373"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <StickySaveBar
            visible={isDirty}
            submitting={isPending}
            onSave={form.handleSubmit(onSubmit)}
            onDiscard={onDiscard}
          />
        </form>
      </Form>
    </div>
  )
}
