"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
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

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  const prismaUser = await prisma.user.findUnique({
    where: { id: authData.user.id },
    select: { role: true, isActive: true },
  });

  if (!prismaUser) {
    // Supabase auth user exists but Prisma User row missing:
    // misconfiguration — sign out and fail closed
    await supabase.auth.signOut();
    return { error: "Account non configurato, contatta l'amministratore" };
  }

  if (!prismaUser.isActive) {
    await supabase.auth.signOut();
    return { error: "Account disattivato, contatta l'amministratore" };
  }

  redirect(getDashboardPath(prismaUser.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
