import { redirect } from "next/navigation";

import { AppShell } from "@/components/dashboard/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";

  return (
    <AppShell email={user.email ?? ""} displayName={displayName}>
      {children}
    </AppShell>
  );
}
