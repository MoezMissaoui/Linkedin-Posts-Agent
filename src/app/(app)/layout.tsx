import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/dashboard/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isCollapsed, SIDEBAR_COOKIE } from "@/lib/sidebar";

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

  const cookieStore = await cookies();
  const collapsed = isCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <AppShell
      email={user.email ?? ""}
      displayName={displayName}
      defaultCollapsed={collapsed}
    >
      {children}
    </AppShell>
  );
}
