import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  CalendarClock,
  Image as ImageIcon,
  Plus,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      "id, title, schedule, enable_post_picture, approval_channel, confirmation_channel, updated_at, created_at",
    )
    .order("updated_at", { ascending: false, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Configuration</p>
          <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque agent encapsule un prompt, un schedule et des canaux de
            publication.
          </p>
        </div>
        <Link
          href="/agents/new"
          className={buttonVariants({ size: "default" })}
        >
          <Plus className="size-4" />
          Nouvel agent
        </Link>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erreur : {error.message}
        </p>
      ) : !agents || agents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
}: {
  agent: {
    id: string;
    title: string | null;
    schedule: boolean;
    enable_post_picture: boolean;
    approval_channel: string | null;
    confirmation_channel: string | null;
    updated_at: string | null;
    created_at: string;
  };
}) {
  const updated = agent.updated_at ?? agent.created_at;

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group block focus:outline-none"
    >
      <Card className="h-full overflow-hidden transition-colors group-hover:border-foreground/30">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg brand-gradient text-white">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold">
                {agent.title || "Agent sans titre"}
              </h3>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {agent.schedule ? (
              <Pill icon={<CalendarClock className="size-3" />}>
                Planifié
              </Pill>
            ) : null}
            {agent.enable_post_picture ? (
              <Pill icon={<ImageIcon className="size-3" />}>Image</Pill>
            ) : null}
            {agent.approval_channel ? (
              <Pill>Approval · {agent.approval_channel}</Pill>
            ) : null}
            {agent.confirmation_channel &&
            agent.confirmation_channel !== agent.approval_channel ? (
              <Pill>Confirm · {agent.confirmation_channel}</Pill>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Mis à jour le {dateFormatter.format(new Date(updated))}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Pill({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px] text-secondary-foreground",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-full brand-gradient text-white shadow-lg shadow-primary/25">
          <Bot className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium">Tu n&apos;as pas encore d&apos;agent</p>
          <p className="text-sm text-muted-foreground">
            Crée un premier agent pour commencer à générer et publier des
            posts LinkedIn.
          </p>
        </div>
        <Link
          href="/agents/new"
          className={buttonVariants({ size: "default" })}
        >
          <Plus className="size-4" />
          Créer mon premier agent
        </Link>
      </CardContent>
    </Card>
  );
}
