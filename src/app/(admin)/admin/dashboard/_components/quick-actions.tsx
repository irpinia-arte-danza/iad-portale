"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni rapide</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/athletes">
              <Plus className="h-4 w-4" />
              Aggiungi nuova allieva
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/parents">
              <Plus className="h-4 w-4" />
              Aggiungi nuovo genitore
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
