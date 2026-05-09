import { redirect } from "next/navigation";
import { Bot, FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive: middleware should already gate this route.
  if (!user) redirect("/auth/login");

  const [{ count: agentsCount }, { count: postsCount }] = await Promise.all([
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase.from("linkedin_posts").select("*", { count: "exact", head: true }),
  ]);

  const meta = user.user_metadata ?? {};
  const greetingName =
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    user.email?.split("@")[0] ||
    "";

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-sm text-muted-foreground">Bienvenue</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Hey, <span className="brand-text">{greetingName}</span> 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tes agents Postilys, leurs schedules et leurs posts LinkedIn — tout
          au même endroit.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<Bot className="size-5" />}
          label="Agents"
          value={agentsCount ?? 0}
          hint="Configurations IA actives"
        />
        <StatCard
          icon={<FileText className="size-5" />}
          label="Posts LinkedIn"
          value={postsCount ?? 0}
          hint="Brouillons + publiés"
        />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
