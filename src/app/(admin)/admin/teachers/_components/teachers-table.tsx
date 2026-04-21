"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TeacherRowActions } from "./teacher-row-actions"

type TeacherRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  fiscalCode: string | null
  qualifications: string | null
  _count: { courses: number }
}

interface TeachersTableProps {
  teachers: TeacherRow[]
}

export function TeachersTable({ teachers }: TeachersTableProps) {
  if (teachers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessun insegnante trovato</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova a modificare la ricerca o aggiungi il primo insegnante.
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
            <TableHead className="hidden lg:table-cell">Qualifiche</TableHead>
            <TableHead className="text-center">Corsi</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {teacher.lastName} {teacher.firstName}
                  </span>
                  <span className="sm:hidden truncate max-w-[200px] text-xs text-muted-foreground">
                    {teacher.email || teacher.phone || "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                {teacher.email || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {teacher.phone || "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell max-w-[240px] truncate text-muted-foreground">
                {teacher.qualifications || "—"}
              </TableCell>
              <TableCell className="text-center">
                {teacher._count.courses}
              </TableCell>
              <TableCell>
                <TeacherRowActions teacher={teacher} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
