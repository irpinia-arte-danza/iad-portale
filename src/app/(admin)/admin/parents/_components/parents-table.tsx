"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ParentRowActions } from "./parent-row-actions"

type ParentRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  receivesEmailCommunications: boolean
  remindersEnabled: boolean
  _count: { athleteRelations: number }
}

interface ParentsTableProps {
  parents: ParentRow[]
}

export function ParentsTable({ parents }: ParentsTableProps) {
  if (parents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessun genitore trovato</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova a modificare la ricerca o aggiungi il primo genitore.
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
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Telefono</TableHead>
            <TableHead className="text-center">Allieve</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {parents.map((parent) => (
            <TableRow key={parent.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {parent.lastName} {parent.firstName}
                  </span>
                  <span className="sm:hidden truncate max-w-[200px] text-xs text-muted-foreground">
                    {parent.email || parent.phone || "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                {parent.email || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {parent.phone || "—"}
              </TableCell>
              <TableCell className="text-center">
                {parent._count.athleteRelations}
              </TableCell>
              <TableCell>
                <ParentRowActions parent={parent} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
