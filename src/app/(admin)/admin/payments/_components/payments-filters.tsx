"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { FeeType, PaymentStatus } from "@prisma/client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"

interface PaymentsFiltersProps {
  defaultFeeType?: FeeType
  defaultStatus?: PaymentStatus
}

const FEE_TYPE_ORDER: FeeType[] = [
  "MONTHLY",
  "TRIMESTER",
  "ASSOCIATION",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
]

const ALL = "__all__"

export function PaymentsFilters({
  defaultFeeType,
  defaultStatus,
}: PaymentsFiltersProps) {
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
        value={defaultFeeType ?? ALL}
        onValueChange={(value) =>
          updateParam("feeType", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Tutti i tipi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tutti i tipi</SelectItem>
          {FEE_TYPE_ORDER.map((type) => (
            <SelectItem key={type} value={type}>
              {FEE_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaultStatus ?? ALL}
        onValueChange={(value) =>
          updateParam("status", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Tutti gli stati" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tutti gli stati</SelectItem>
          <SelectItem value="PAID">Pagato</SelectItem>
          <SelectItem value="REVERSED">Stornato</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
