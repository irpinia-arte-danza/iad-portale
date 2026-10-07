"use server";

import { redirect } from "next/navigation";

import { resolveAccountState } from "@/lib/auth/account-state";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import {
  attemptEmail,
  attemptsBlockedUntil,
  clientIp,
  recordLoginAttempt,
  TOO_MANY_ATTEMPTS_MESSAGE,
} from "@/lib/auth/login-attempts";
import { loginErrorMessage } from "@/lib/auth/login-error";
import { MFA_VERIFY_PATH } from "@/lib/auth/mfa-gate";
import { createClient } from "@/lib/supabase/server";

type LoginValues = {
  email: string;
  password: string;
};

export async function login(
  values: LoginValues
): Promise<{ error: string } | void> {
  // Dopo 5 tentativi falliti in 10 minuti (per email o per IP) si rifiuta
  // per 15 minuti, prima ancora di chiedere a Supabase
  const key = {
    kind: "LOGIN" as const,
    email: attemptEmail(values.email),
    ip: await clientIp(),
  };
  if (await attemptsBlockedUntil(key)) {
    return { error: TOO_MANY_ATTEMPTS_MESSAGE };
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    await recordLoginAttempt(key, false);
    return { error: loginErrorMessage(error.message) };
  }
  await recordLoginAttempt(key, true);

  // Credenziali valide ma account non utilizzabile (utente disattivato,
  // genitore/insegnante nel cestino, account senza profilo): logout e
  // messaggio, invece di mandarlo in una dashboard che lo respingerebbe.
  const account = await resolveAccountState(authData.user.id);
  if (account.state === "blocked") {
    await supabase.auth.signOut();
    return {
      error:
        account.reason === "no-user"
          ? "Account non configurato, contatta la segreteria"
          : "Il tuo accesso all'area riservata non è attivo. Contatta la segreteria",
    };
  }

  // Gli admin hanno il secondo fattore: la pagina decide se chiedere il
  // codice o far fare l'iscrizione. Gli altri ruoli entrano come sempre.
  if (account.role === "ADMIN") redirect(MFA_VERIFY_PATH);

  redirect(getDashboardPath(account.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
