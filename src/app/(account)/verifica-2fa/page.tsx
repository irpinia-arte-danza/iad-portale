import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PrivacyLink } from "@/components/privacy-link"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { Button } from "@/components/ui/button"
import {
  getSessionLevel,
  hasRecoveryPass,
  pendingRecoveryNotice,
  verifiedTotpFactor,
} from "@/lib/auth/mfa"
import { adminGate, MFA_ENROLL_PATH } from "@/lib/auth/mfa-gate"
import { countUnusedRecoveryCodes } from "@/lib/auth/recovery-codes"
import { requireAdminFirstFactor } from "@/lib/auth/require-admin"
import { createClient } from "@/lib/supabase/server"

import { continueAfterRecoveryNotice } from "./actions"
import { VerifyTotpForm } from "./_components/verify-totp-form"

export const dynamic = "force-dynamic"

function RecoveryNotice({ remaining }: { remaining: number }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Codice di recupero accettato</CardTitle>
            <CardDescription>
              <strong className="text-foreground">Ti restano {remaining} codici</strong>
              {remaining <= 2
                ? ". Appena puoi, da Impostazioni › Account, «Collega di nuovo l'app» per averne otto nuovi."
                : ". Quando li finisci, da Impostazioni › Account puoi collegare di nuovo l'app e averne otto nuovi."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={continueAfterRecoveryNotice}>
              <Button type="submit" className="w-full min-h-11">
                Continua
              </Button>
            </form>
          </CardContent>
        </Card>
        <footer className="mt-2 text-center">
          <PrivacyLink />
        </footer>
      </div>
    </main>
  )
}

// Il secondo passaggio del login di un admin. Chi ha già passato il secondo
// fattore va alla dashboard; chi non ha ancora un fattore va a iscriverlo.
export default async function VerifySecondFactorPage() {
  const { userId } = await requireAdminFirstFactor()

  const level = await getSessionLevel()
  const recoveryPass = await hasRecoveryPass(userId, level.sessionId)
  if (adminGate({ role: "ADMIN", aal: level.aal, recoveryPass }) === "ok") {
    // Appena entrati con un codice di recupero: prima l'avviso, poi la dashboard
    const remaining = recoveryPass ? await pendingRecoveryNotice() : null
    if (remaining === null) redirect(getDashboardPath("ADMIN"))
    return <RecoveryNotice remaining={remaining} />
  }

  const supabase = await createClient()
  const factor = await verifiedTotpFactor(supabase)
  if (!factor) redirect(MFA_ENROLL_PATH)

  const recoveryCodesLeft = await countUnusedRecoveryCodes(userId)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ancora un passaggio</CardTitle>
            <CardDescription>
              Apri l&apos;app Password sull&apos;iPad e scrivi qui i sei numeri che compaiono
              accanto a «IAD Portale».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifyTotpForm recoveryCodesLeft={recoveryCodesLeft} />
          </CardContent>
        </Card>
        <footer className="mt-2 text-center">
          <PrivacyLink />
        </footer>
      </div>
    </main>
  )
}
