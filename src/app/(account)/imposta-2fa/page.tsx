import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PrivacyLink } from "@/components/privacy-link"
import { requireAdminFirstFactor } from "@/lib/auth/require-admin"
import { getSessionLevel, hasRecoveryPass, verifiedTotpFactor } from "@/lib/auth/mfa"
import { adminGate, MFA_VERIFY_PATH } from "@/lib/auth/mfa-gate"
import { createClient } from "@/lib/supabase/server"

import { EnrollTotp } from "./_components/enroll-totp"

export const dynamic = "force-dynamic"

// L'iscrizione al secondo fattore. Ci arriva un admin senza fattore (al
// primo accesso, o dopo l'azzeramento da parte dell'altro admin) e non può
// fare altro finché non la completa. Un admin con il fattore già attivo
// può sostituirlo solo dopo il secondo passaggio.
export default async function EnrollSecondFactorPage() {
  const { userId } = await requireAdminFirstFactor()

  const supabase = await createClient()
  const existing = await verifiedTotpFactor(supabase)
  if (existing) {
    const level = await getSessionLevel()
    const recoveryPass = await hasRecoveryPass(userId, level.sessionId)
    if (adminGate({ role: "ADMIN", aal: level.aal, recoveryPass }) !== "ok") {
      redirect(MFA_VERIFY_PATH)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {existing ? "Sostituisci il secondo fattore" : "Proteggi il tuo accesso"}
            </CardTitle>
            <CardDescription>
              {existing
                ? "Il nuovo dispositivo prende il posto di quello attuale. Alla fine riceverai otto codici di recupero nuovi: quelli vecchi non valgono più."
                : "Da oggi, oltre alla password, per entrare servono sei numeri che cambiano ogni mezzo minuto. Li genera l'app Password dell'iPad: bastano due minuti per collegarla."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollTotp />
          </CardContent>
        </Card>
        <footer className="mt-2 text-center">
          <PrivacyLink />
        </footer>
      </div>
    </main>
  )
}
