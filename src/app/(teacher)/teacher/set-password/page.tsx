import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireTeacher } from "@/lib/auth/require-teacher"

import { SetPasswordForm } from "./_components/set-password-form"

type PageProps = {
  searchParams: Promise<{ next?: string; recovery?: string }>
}

export default async function TeacherSetPasswordPage({
  searchParams,
}: PageProps) {
  await requireTeacher()
  const { next, recovery } = await searchParams

  const safeNext = next && next.startsWith("/") ? next : "/teacher/dashboard"
  const isRecovery = recovery === "1"

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {isRecovery ? "Reimposta la password" : "Imposta la tua password"}
          </CardTitle>
          <CardDescription>
            {isRecovery
              ? "Scegli una nuova password per il tuo account."
              : "Benvenuta nell'area insegnanti. Crea una password per accedere d'ora in avanti."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm next={safeNext} />
        </CardContent>
      </Card>
    </div>
  )
}
