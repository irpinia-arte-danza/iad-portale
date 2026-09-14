"use server";

import { redirect } from "next/navigation";

import { resolveAccountState } from "@/lib/auth/account-state";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { createClient } from "@/lib/supabase/server";

type LoginValues = {
  email: string;
  password: string;
};

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email o password non corretti";
  }
  if (message.includes("Email not confirmed")) {
    return "Accesso non ancora attivato: usa il link ricevuto via email oppure «Password dimenticata»";
  }
  if (message.includes("Too many requests")) {
    return "Troppi tentativi, riprova tra qualche minuto";
  }
  return "Errore durante l'accesso, riprova";
}

export async function login(
  values: LoginValues
): Promise<{ error: string } | void> {
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

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

  redirect(getDashboardPath(account.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
