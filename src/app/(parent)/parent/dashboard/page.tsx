import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export default async function ParentDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true },
  })

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">
        Ciao {user?.firstName ?? "Genitore"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Benvenuto nella tua area genitore.
      </p>
    </div>
  )
}
