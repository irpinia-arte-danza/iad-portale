import Link from "next/link"
import { Printer } from "lucide-react"
import type { ReceiptStatus } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { todayInRome } from "@/lib/receipts/numbering"
import { receiptPdfHref } from "@/lib/receipts/types"
import { formatDateShort, formatEur } from "@/lib/utils/format"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listReceiptYears, listReceipts } from "./queries"
import { ReceiptsFilters } from "./_components/receipts-filters"

interface PageProps {
  searchParams: Promise<{
    year?: string
    status?: string
    search?: string
  }>
}

function parseYear(value: string | undefined, fallback: number): number {
  const year = Number.parseInt(value ?? "", 10)
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : fallback
}

function parseStatus(value: string | undefined): ReceiptStatus | undefined {
  return value === "VALID" || value === "CANCELLED" ? value : undefined
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const year = parseYear(resolved.year, todayInRome().getUTCFullYear())
  const status = parseStatus(resolved.status)
  const search = resolved.search ?? ""

  const [{ items, summary }, years] = await Promise.all([
    listReceipts({ year, status, search }),
    listReceiptYears(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Ricevute" }]}
        title="Ricevute"
        description="Registro delle ricevute emesse, in ordine di numero. Le ricevute annullate restano nell'elenco con il loro numero."
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ReceiptsFilters
            years={years.includes(year) ? years : [year, ...years]}
            year={year}
            status={status}
            search={search}
          />

          <p className="text-sm text-muted-foreground">
            {year}: <strong className="text-foreground">{summary.validCount}</strong>{" "}
            {summary.validCount === 1 ? "ricevuta valida" : "ricevute valide"} per{" "}
            <strong className="font-mono text-foreground">
              {formatEur(summary.validAmountCents)}
            </strong>
            {summary.cancelledCount > 0
              ? ` · ${summary.cancelledCount} ${summary.cancelledCount === 1 ? "annullata" : "annullate"}`
              : ""}
          </p>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-sm font-medium">Nessuna ricevuta trovata</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Le ricevute si emettono dall&apos;elenco o dal dettaglio pagamenti.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Emessa il</TableHead>
                    <TableHead>Allieva</TableHead>
                    <TableHead className="hidden md:table-cell">Pagante</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[60px]">
                      <span className="sr-only">PDF</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => {
                    const cancelled = r.status === "CANCELLED"
                    return (
                      <TableRow key={r.id}>
                        <TableCell
                          className={
                            cancelled
                              ? "font-mono text-xs text-muted-foreground line-through"
                              : "font-mono text-xs font-medium"
                          }
                        >
                          {r.receiptNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatDateShort(r.issueDate)}
                        </TableCell>
                        <TableCell>
                          {r.payment ? (
                            <Link
                              href={`/admin/athletes/${r.payment.athleteId}`}
                              className="hover:underline"
                            >
                              {r.athleteName ?? "—"}
                            </Link>
                          ) : (
                            r.athleteName ?? "—"
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {r.payerName ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatEur(r.amountCents ?? r.payment?.amountCents ?? 0)}
                        </TableCell>
                        <TableCell>
                          {cancelled ? (
                            <Badge variant="destructive">Annullata</Badge>
                          ) : (
                            <Badge variant="outline">Valida</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <a
                            href={receiptPdfHref(r.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Apri PDF ricevuta ${r.receiptNumber}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                          >
                            <Printer className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ResourceContent>
    </>
  )
}
