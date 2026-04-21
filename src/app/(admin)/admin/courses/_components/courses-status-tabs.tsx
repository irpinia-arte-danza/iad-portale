"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { CourseStatusFilter } from "../queries"

interface CoursesStatusTabsProps {
  current: CourseStatusFilter
  counts: { active: number; archived: number; all: number }
}

export function CoursesStatusTabs({ current, counts }: CoursesStatusTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "active") params.delete("status")
    else params.set("status", next)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="active">Attivi ({counts.active})</TabsTrigger>
        <TabsTrigger value="archived">
          Archiviati ({counts.archived})
        </TabsTrigger>
        <TabsTrigger value="all">Tutti ({counts.all})</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
