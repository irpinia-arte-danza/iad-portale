"use client"

import { Loader2, Save, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StickySaveBarProps {
  visible: boolean
  submitting: boolean
  onSave: () => void
  onDiscard: () => void
  label?: string
}

export function StickySaveBar({
  visible,
  submitting,
  onSave,
  onDiscard,
  label = "Modifiche non salvate",
}: StickySaveBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur",
        "transition-all duration-200",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={submitting}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            Annulla
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salva
          </Button>
        </div>
      </div>
    </div>
  )
}
