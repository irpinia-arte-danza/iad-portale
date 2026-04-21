"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ExpenseType, PaymentMethod } from "@prisma/client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EXPENSE_TYPE_LABELS } from "@/lib/schemas/expense"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"

interface ExpensesFiltersProps {
  defaultType?: ExpenseType
  defaultMethod?: PaymentMethod
}

const EXPENSE_TYPE_ORDER: ExpenseType[] = [
  "RENT",
  "TAX_F24",
  "UTILITY",
  "COMPENSATION",
  "COSTUME_PURCHASE",
  "MATERIAL",
  "INSURANCE",
  "AFFILIATION",
  "OTHER",
]

const METHOD_ORDER: PaymentMethod[] = [
  "TRANSFER",
  "CASH",
  "POS",
  "SUMUP_LINK",
  "OTHER",
]

const ALL = "__all__"

export function ExpensesFilters({
  defaultType,
  defaultMethod,
}: ExpensesFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === ALL) params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={defaultType ?? ALL}
        onValueChange={(value) =>
          updateParam("type", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Tutti i tipi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tutti i tipi</SelectItem>
          {EXPENSE_TYPE_ORDER.map((type) => (
            <SelectItem key={type} value={type}>
              {EXPENSE_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaultMethod ?? ALL}
        onValueChange={(value) =>
          updateParam("method", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Tutti i metodi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tutti i metodi</SelectItem>
          {METHOD_ORDER.map((method) => (
            <SelectItem key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
