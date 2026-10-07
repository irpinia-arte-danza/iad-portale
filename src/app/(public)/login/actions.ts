"use server";

import { redirect } from "next/navigation";

import { resolveAccountState } from "@/lib/auth/account-state";
import { adminUserByEmail, recordAdminFailure } from "@/lib/auth/admin-logins";
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
  // Dal browser: schermo touch su piattaforma Mac = iPad (device-hint.ts)
  touchMac?: boolean;
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
  const hint = { touchMac: values.touchMac === true };
  if (await attemptsBlockedUntil(key)) {
    // Solo per gli admin resta traccia nello storico degli accessi
    const adminId = await adminUserByEmail(key.email);
    if (adminId) await recordAdminFailure(adminId, "BLOCKED", hint);
    return { error: TOO_MANY_ATTEMPTS_MESSAGE };
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    await recordLoginAttempt(key, false);
    const adminId = await adminUserByEmail(key.email);
    if (adminId) await recordAdminFailure(adminId, "WRONG_PASSWORD", hint);
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
