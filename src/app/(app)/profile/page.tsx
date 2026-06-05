import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./_components/profile-form";
import { PasswordForm } from "./_components/password-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const meta = user.user_metadata ?? {};
  const displayName =
    typeof meta.display_name === "string"
      ? meta.display_name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : "";

  const initials =
    (displayName || user.email || "?")
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="grid place-items-center size-16 rounded-full brand-gradient text-white text-xl font-semibold shadow-lg shadow-primary/25 ring-1 ring-white/15"
          aria-hidden
        >
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {displayName || user.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gère ton profil et la sécurité de ton compte
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm
          email={user.email ?? ""}
          displayName={displayName}
          emailConfirmed={Boolean(user.email_confirmed_at)}
        />
        <PasswordForm />
      </div>
    </div>
  );
}
