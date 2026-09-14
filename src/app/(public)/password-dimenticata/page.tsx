import { ForgotPasswordForm } from "./_components/forgot-password-form"

type PageProps = {
  searchParams: Promise<{ motivo?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const { motivo } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm linkInvalid={motivo === "link-non-valido"} />
      </div>
    </main>
  )
}
