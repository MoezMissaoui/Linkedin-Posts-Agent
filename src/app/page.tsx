import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Middleware also handles this redirect; this is a safety net for Server-only paths.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/auth/login");
}
