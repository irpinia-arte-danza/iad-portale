"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PaymentStatus } from "@prisma/client"

import { PaymentDeleteDialog } from "./payment-delete-dialog"
import { PaymentEditDialog } from "./payment-edit-dialog"
import { PaymentReverseDialog } from "./payment-reverse-dialog"

interface PaymentRowActionsProps {
  payment: {
    id: string
    status: PaymentStatus
    notes: string | null
    athleteName: string
  }
}

export function PaymentRowActions({ payment }: PaymentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isReversed = payment.status === "REVERSED"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Azioni"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica note
          </DropdownMenuItem>
          {!isReversed && (
            <DropdownMenuItem
              onClick={() => setReverseOpen(true)}
              variant="destructive"
            >
              <RotateCcw className="h-4 w-4" />
              Storna pagamento
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PaymentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        payment={{
          id: payment.id,
          notes: payment.notes,
          athleteName: payment.athleteName,
        }}
      />

      <PaymentReverseDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        payment={{
          id: payment.id,
          athleteName: payment.athleteName,
        }}
      />

      <PaymentDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        payment={{
          id: payment.id,
          athleteName: payment.athleteName,
        }}
      />
    </>
  )
}
