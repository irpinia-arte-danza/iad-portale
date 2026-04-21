"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

import { deleteLogo, uploadLogo } from "../actions"

import type { BrandLogoSlot } from "@/lib/supabase/storage-brand"

interface LogoSlotUploadProps {
  slot: BrandLogoSlot
  title: string
  description: string
  hint?: string
  initialUrl: string | null
  previewClassName?: string
}

export function LogoSlotUpload({
  slot,
  title,
  description,
  hint,
  initialUrl,
  previewClassName,
}: LogoSlotUploadProps) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // reset input so same file re-triggers
    if (!file) return

    const formData = new FormData()
    formData.set("file", file)

    startTransition(async () => {
      const res = await uploadLogo(slot, formData)
      if (res.ok) {
        setUrl(res.data?.publicUrl ?? null)
        toast.success("Logo caricato")
      } else {
        toast.error(res.error)
      }
    })
  }

  function onConfirmDelete() {
    startTransition(async () => {
      const res = await deleteLogo(slot)
      if (res.ok) {
        setUrl(null)
        toast.success("Logo rimosso")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md border bg-muted/30",
          previewClassName ?? "h-32",
        )}
      >
        {url ? (
          <Image
            src={url}
            alt={title}
            width={240}
            height={120}
            className="h-full w-auto object-contain p-2"
            unoptimized
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            Nessun file caricato
          </span>
        )}
      </div>

      {hint ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openPicker}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1 h-4 w-4" />
          )}
          {url ? "Sostituisci" : "Carica"}
        </Button>

        {url ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Elimina
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Elimina logo</AlertDialogTitle>
                <AlertDialogDescription>
                  Il file verrà rimosso dallo storage e l&apos;UI tornerà al
                  placeholder.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirmDelete}>
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          onChange={onFileChange}
        />
      </div>
    </div>
  )
}
