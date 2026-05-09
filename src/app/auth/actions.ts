"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  ok: boolean;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

async function getOrigin() {
  const h = await headers();
  return (
    h.get("origin") ??
    (h.get("x-forwarded-proto") && h.get("host")
      ? `${h.get("x-forwarded-proto")}://${h.get("host")}`
      : `http://${h.get("host") ?? "localhost:2026"}`)
  );
}

export async function signIn(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }
  if (!password) {
    return { ok: false, message: "Mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: humanizeAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`,
    };
  }
  if (password !== confirm) {
    return { ok: false, message: "Les mots de passe ne correspondent pas." };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { ok: false, message: humanizeAuthError(error.message) };
  }

  // If email confirmation is enabled, session is null and the user must verify.
  if (!data.session) {
    return {
      ok: true,
      message:
        "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function requestPasswordReset(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { ok: false, message: humanizeAuthError(error.message) };
  }

  return {
    ok: true,
    message:
      "Si un compte existe pour cet e-mail, un lien de réinitialisation vient de t'être envoyé.",
  };
}

export async function updatePassword(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`,
    };
  }
  if (password !== confirm) {
    return { ok: false, message: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: humanizeAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (m.includes("email not confirmed")) {
    return "Ton e-mail n'est pas encore confirmé. Vérifie ta boîte mail.";
  }
  if (m.includes("user already registered")) {
    return "Un compte existe déjà avec cet e-mail.";
  }
  if (m.includes("rate limit")) {
    return "Trop de tentatives, réessaie dans quelques minutes.";
  }
  return raw;
}
