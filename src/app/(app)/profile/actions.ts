"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FormState = {
  ok: boolean;
  message?: string;
};

const MIN_PASSWORD = 8;
const MAX_NAME = 80;

function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Mot de passe actuel incorrect.";
  }
  if (m.includes("same as the old password")) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  if (m.includes("rate limit")) {
    return "Trop de tentatives, réessaie dans quelques minutes.";
  }
  return raw;
}

export async function updateProfile(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (fullName.length > MAX_NAME) {
    return {
      ok: false,
      message: `Le nom doit faire au maximum ${MAX_NAME} caractères.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Session expirée. Reconnecte-toi." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName || null },
  });

  if (error) {
    return { ok: false, message: humanizeAuthError(error.message) };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profil mis à jour." };
}

export async function changePassword(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!currentPassword) {
    return { ok: false, message: "Mot de passe actuel requis." };
  }
  if (newPassword.length < MIN_PASSWORD) {
    return {
      ok: false,
      message: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`,
    };
  }
  if (newPassword !== confirm) {
    return { ok: false, message: "Les mots de passe ne correspondent pas." };
  }
  if (newPassword === currentPassword) {
    return {
      ok: false,
      message: "Le nouveau mot de passe doit être différent de l'ancien.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, message: "Session expirée. Reconnecte-toi." };
  }

  // Verify current password (re-authenticate).
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { ok: false, message: humanizeAuthError(signInError.message) };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return { ok: false, message: humanizeAuthError(updateError.message) };
  }

  revalidatePath("/profile");
  return { ok: true, message: "Mot de passe mis à jour." };
}
