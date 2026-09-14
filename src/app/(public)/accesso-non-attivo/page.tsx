import Link from "next/link"
import { UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AccessNotActivePage() {
  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdName: true, asdEmail: true, asdPhone: true },
  })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <UserX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-xl">Accesso non attivo</CardTitle>
            <CardDescription>
              Il tuo account non è abilitato a entrare nell&apos;area
              riservata{brand?.asdName ? ` di ${brand.asdName}` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Succede quando l&apos;accesso non è ancora stato attivato dalla
              segreteria oppure è stato chiuso. Per sicurezza ti abbiamo
              disconnesso.
            </p>
            {brand?.asdEmail || brand?.asdPhone ? (
              <div className="rounded-md border p-3">
                <p className="font-medium">Contatta la segreteria</p>
                {brand.asdEmail ? (
                  <a
                    href={`mailto:${brand.asdEmail}`}
                    className="block min-h-11 py-3 underline-offset-4 hover:underline"
                  >
                    {brand.asdEmail}
                  </a>
                ) : null}
                {brand.asdPhone ? (
                  <a
                    href={`tel:${brand.asdPhone}`}
                    className="block min-h-11 py-3 font-mono underline-offset-4 hover:underline"
                  >
                    {brand.asdPhone}
                  </a>
                ) : null}
              </div>
            ) : null}
            <Button asChild className="w-full min-h-11">
              <Link href="/login">Torna alla pagina di accesso</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
