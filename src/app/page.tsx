import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { getCurrentAccount } from "@/lib/auth/current-account"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Prima pagina di area.irpiniaartedanza.it. Chi ha già una sessione valida
// va dritto alla propria dashboard; chi ha una sessione non più utilizzabile
// passa dal logout con spiegazione.
export default async function HomePage() {
  const account = await getCurrentAccount()
  if (account.state === "ok") redirect(getDashboardPath(account.role))
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)

  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdName: true, asdEmail: true, logoUrl: true, logoDarkUrl: true },
  })

  const asdName = brand?.asdName ?? "IAD Portale"
  const lightLogo = brand?.logoUrl ?? null
  const darkLogo = brand?.logoDarkUrl || lightLogo

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            {lightLogo ? (
              <div className="mb-2 flex justify-center">
                <Image
                  src={lightLogo}
                  alt={`${asdName} logo`}
                  width={240}
                  height={96}
                  priority
                  className="block h-24 w-auto object-contain dark:hidden"
                />
                {darkLogo ? (
                  <Image
                    src={darkLogo}
                    alt={`${asdName} logo`}
                    width={240}
                    height={96}
                    priority
                    className="hidden h-24 w-auto object-contain dark:block"
                  />
                ) : null}
              </div>
            ) : null}
            <CardTitle className="text-xl">{asdName}</CardTitle>
            <CardDescription>
              Area riservata per famiglie e insegnanti: quote, ricevute,
              presenze e orari delle lezioni.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full min-h-11">
              <Link href="/login">Accedi all&apos;area riservata</Link>
            </Button>
            {brand?.asdEmail ? (
              <p className="text-center text-xs text-muted-foreground">
                Non hai ancora ricevuto l&apos;accesso? Chiedi in segreteria:{" "}
                {brand.asdEmail}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
