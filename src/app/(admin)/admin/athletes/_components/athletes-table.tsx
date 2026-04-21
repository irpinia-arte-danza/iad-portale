"use client"

import Link from "next/link"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type AthleteRow = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: "F" | "M" | "OTHER"
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
  _count: { parentRelations: number }
}

interface AthletesTableProps {
  athletes: AthleteRow[]
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

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function AthletesTable({ athletes }: AthletesTableProps) {
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
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Età</TableHead>
            <TableHead className="hidden md:table-cell">Stato</TableHead>
            <TableHead className="text-center">Genitori</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {athletes.map((athlete) => (
            <TableRow
              key={athlete.id}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell>
                <Link
                  href={`/admin/athletes/${athlete.id}`}
                  className="block"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {athlete.lastName} {athlete.firstName}
                    </span>
                    <span className="sm:hidden text-xs text-muted-foreground">
                      {calculateAge(athlete.dateOfBirth)} anni ·{" "}
                      {STATUS_LABELS[athlete.status]}
                    </span>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {calculateAge(athlete.dateOfBirth)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={STATUS_VARIANTS[athlete.status]}>
                  {STATUS_LABELS[athlete.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {athlete._count.parentRelations}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  aria-label="Azioni"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
