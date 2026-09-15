"use client"

import Link from "next/link"
import { ArrowDown } from "lucide-react"

import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { CertStatus } from "@/lib/medical-certificates/certificate-status"
import { cn } from "@/lib/utils"
import { computeAge } from "@/lib/utils/date-helpers"
import { formatDateShort } from "@/lib/utils/format"

import { AthleteRowActions } from "./athlete-row-actions"

type AthleteRow = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: "F" | "M" | "OTHER"
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
  fiscalCode: string | null
  placeOfBirth: string | null
  provinceOfBirth: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  instructorNotes: string | null
  _count: { parentRelations: number }
  // Certificato corrente, stato calcolato lato server
  certificate: { expiryDate: Date | null; status: CertStatus }
}

type AthletesSort = "name" | "certificate"

interface AthletesTableProps {
  athletes: AthleteRow[]
  sort: AthletesSort
  sortHrefs: Record<AthletesSort, string>
}

const STATUS_LABELS: Record<AthleteRow["status"], string> = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
}

const STATUS_VARIANTS: Record<
  AthleteRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  WITHDRAWN: "destructive",
}

function SortLink({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground hover:underline",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active ? <ArrowDown className="h-3 w-3" /> : null}
    </Link>
  )
}

export function AthletesTable({ athletes, sort, sortHrefs }: AthletesTableProps) {
  if (athletes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessuna allieva trovata</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova a modificare la ricerca o aggiungi la prima allieva.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortLink
                label="Nome"
                href={sortHrefs.name}
                active={sort === "name"}
              />
            </TableHead>
            <TableHead className="hidden sm:table-cell">Età</TableHead>
            <TableHead className="hidden md:table-cell">Stato</TableHead>
            <TableHead>
              <SortLink
                label="Certificato"
                href={sortHrefs.certificate}
                active={sort === "certificate"}
              />
            </TableHead>
            <TableHead className="hidden text-center sm:table-cell">
              Genitori
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {athletes.map((athlete) => {
            const age = computeAge(athlete.dateOfBirth)
            const { certificate } = athlete
            const expired = certificate.status === "expired"
            return (
            <TableRow
              key={athlete.id}
              className={cn(
                "hover:bg-muted/50",
                expired &&
                  "bg-red-50 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/50",
              )}
            >
              <TableCell>
                <Link
                  href={`/admin/athletes/${athlete.id}`}
                  className="block hover:underline"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {athlete.lastName} {athlete.firstName}
                    </span>
                    <span className="sm:hidden text-xs text-muted-foreground">
                      {age !== null ? `${age} anni` : "—"} ·{" "}
                      {STATUS_LABELS[athlete.status]}
                    </span>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {age !== null ? age : "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={STATUS_VARIANTS[athlete.status]}>
                  {STATUS_LABELS[athlete.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <CertStatusBadge status={certificate.status} alertMissing />
                  {certificate.expiryDate ? (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {expired ? "scaduto il" : "scade il"}{" "}
                      {formatDateShort(new Date(certificate.expiryDate))}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden text-center sm:table-cell">
                {athlete._count.parentRelations}
              </TableCell>
              <TableCell>
                <AthleteRowActions
                  athlete={{
                    id: athlete.id,
                    firstName: athlete.firstName,
                    lastName: athlete.lastName,
                    dateOfBirth: athlete.dateOfBirth,
                    gender: athlete.gender,
                    fiscalCode: athlete.fiscalCode,
                    placeOfBirth: athlete.placeOfBirth,
                    provinceOfBirth: athlete.provinceOfBirth,
                    residenceStreet: athlete.residenceStreet,
                    residenceNumber: athlete.residenceNumber,
                    residenceCity: athlete.residenceCity,
                    residenceProvince: athlete.residenceProvince,
                    residenceCap: athlete.residenceCap,
                    instructorNotes: athlete.instructorNotes,
                  }}
                />
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
