import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { getCurrentAccount } from "@/lib/auth/current-account"

import { SetPasswordForm } from "./_components/set-password-form"

type PageProps = {
  searchParams: Promise<{ tipo?: string }>
}

const AREA_LABELS: Record<UserRole, string> = {
  PARENT: "all'area genitori",
  TEACHER: "all'area insegnanti",
  ADMIN: "al portale",
}

export default async function SetPasswordPage({ searchParams }: PageProps) {
  const account = await getCurrentAccount()
  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)

  const { tipo } = await searchParams
  const isWelcome = tipo === "benvenuto"

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {isWelcome ? "Scegli la tua password" : "Imposta una nuova password"}
            </CardTitle>
            <CardDescription>
              {isWelcome
                ? `Ti diamo il benvenuto ${AREA_LABELS[account.role]}. Scegli la password che userai per i prossimi accessi.`
                : "Scegli una nuova password per il tuo accesso."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
