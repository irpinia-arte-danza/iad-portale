import { LoginForm } from "./login-form";

// Codici errore passati via ?error= da /auth/callback: solo messaggi noti,
// mai testo arbitrario dall'URL.
const LOGIN_ERRORS: Record<string, string> = {
  account_disabled:
    "Il tuo accesso all'area riservata non è attivo. Contatta la segreteria.",
  oauth_failed: "Accesso non riuscito. Entra con email e password.",
  missing_code: "Accesso non riuscito. Entra con email e password.",
};

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (LOGIN_ERRORS[error] ?? "Accesso non riuscito, riprova.")
    : null;

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </main>
  );
}
