"use server";

import { redirect } from "next/navigation";

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
    return "Email non verificata — contatta l'amministratore";
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

  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect("/admin/dashboard");
}
