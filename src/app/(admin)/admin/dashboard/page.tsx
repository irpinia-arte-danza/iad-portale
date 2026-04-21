import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  getDashboardStats,
  getRecentAthletes,
  getRecentParents,
} from "./queries"
import { KpiCards } from "./_components/kpi-cards"
import { RecentActivity } from "./_components/recent-activity"
import { QuickActions } from "./_components/quick-actions"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const [user, stats, athletes, parents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true },
    }),
    getDashboardStats(),
    getRecentAthletes(5),
    getRecentParents(5),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title={`Ciao ${user?.firstName ?? "Admin"} 👋`}
        description="Ecco un riepilogo della situazione IAD oggi."
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <KpiCards stats={stats} />
          <RecentActivity athletes={athletes} parents={parents} />
          <QuickActions />
        </div>
      </ResourceContent>
    </>
  )
}
