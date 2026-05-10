import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  CalendarClock,
  Image as ImageIcon,
  Link2,
  Plus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { AgentActiveToggle } from "./_components/agent-active-toggle";
import { AgentDrawer, type AgentDrawerData } from "./_components/agent-drawer";

const PAGE_SIZE = 6;

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: agentsRaw,
    count,
    error,
  } = await supabase
    .from("agents")
    .select(
      `id, title, schedule, active, enable_post_picture, approval_channel, confirmation_channel, updated_at, created_at,
       linkedin_access_token, linkedin_member_name, linkedin_member_picture, linkedin_connected_at,
       agent_schedule_config (id, custom_cron, timezone, created_at)`,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);

  // Strip the access token before sending to the client. Only a derived boolean leaves the server.
  type AgentRow = NonNullable<typeof agentsRaw>[number];
  const agents: AgentCardRow[] = (agentsRaw ?? []).map((a: AgentRow) => {
    const linkedinConnected = Boolean(a.linkedin_access_token);
    const scheduleCount = (a.agent_schedule_config ?? []).length;
    const canActivate = linkedinConnected && scheduleCount > 0;
    const activateReason = !linkedinConnected
      ? "Connecte LinkedIn d'abord."
      : scheduleCount === 0
        ? "Ajoute au moins un planning d'abord."
        : "";
    return {
      id: a.id,
      title: a.title,
      schedule: a.schedule,
      enable_post_picture: a.enable_post_picture,
      approval_channel: a.approval_channel,
      confirmation_channel: a.confirmation_channel,
      updated_at: a.updated_at,
      created_at: a.created_at,
      linkedin_connected: linkedinConnected,
      schedule_count: scheduleCount,
      active: a.active,
      can_activate: canActivate,
      activate_reason: activateReason,
    };
  });

  const drawerAgents: AgentDrawerData[] = (agentsRaw ?? []).map(
    (a: AgentRow) => ({
      id: a.id,
      title: a.title,
      linkedin: {
        connected: Boolean(a.linkedin_access_token),
        member_name: a.linkedin_member_name,
        member_picture: a.linkedin_member_picture,
        connected_at: a.linkedin_connected_at,
      },
      schedules: (a.agent_schedule_config ?? [])
        .slice()
        .sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
        )
        .map((c) => ({
          id: c.id,
          custom_cron: c.custom_cron,
          timezone: c.timezone,
        })),
    }),
  );

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
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            basePath="/agents"
          />
        </>
      )}

      <AgentDrawer agents={drawerAgents} />
    </div>
  );
}

type AgentCardRow = {
  id: string;
  title: string | null;
  schedule: boolean;
  enable_post_picture: boolean;
  approval_channel: string | null;
  confirmation_channel: string | null;
  updated_at: string | null;
  created_at: string;
  linkedin_connected: boolean;
  schedule_count: number;
  active: boolean;
  can_activate: boolean;
  activate_reason: string;
};

function AgentCard({ agent }: { agent: AgentCardRow }) {
  const updated = agent.updated_at ?? agent.created_at;

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-foreground/30">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Link
            href={`/agents/${agent.id}`}
            className="group flex min-w-0 flex-1 items-start gap-3 focus:outline-none"
          >
            <div className="grid size-10 place-items-center rounded-lg brand-gradient text-white">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold group-hover:underline">
                {agent.title || "Agent sans titre"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mis à jour le {dateFormatter.format(new Date(updated))}
              </p>
            </div>
          </Link>
          <AgentActiveToggle
            agentId={agent.id}
            active={agent.active}
            canActivate={agent.can_activate}
            reason={agent.activate_reason}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {agent.linkedin_connected ? (
            <Pill
              icon={
                <Link2 className="size-3 text-emerald-600 dark:text-emerald-400" />
              }
              className="border-emerald-500/40 bg-emerald-500/10"
            >
              LinkedIn
            </Pill>
          ) : null}
          {agent.schedule_count > 0 ? (
            <Pill icon={<CalendarClock className="size-3" />}>
              {agent.schedule_count} planning{agent.schedule_count > 1 ? "s" : ""}
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

        <div className="mt-auto flex items-center gap-1 border-t border-border/60 pt-3">
          <QuickAction
            href={`/agents?drawer=linkedin&agent=${agent.id}`}
            icon={<Link2 className="size-3.5" />}
            label="LinkedIn"
            tone={agent.linkedin_connected ? "active" : "default"}
          />
          <QuickAction
            href={`/agents?drawer=planning&agent=${agent.id}`}
            icon={<CalendarClock className="size-3.5" />}
            label="Planning"
            tone={agent.schedule_count > 0 ? "active" : "default"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: "default" | "active";
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        tone === "active"
          ? "text-foreground hover:bg-accent"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {label}
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
          <p className="text-base font-medium">
            Tu n&apos;as pas encore d&apos;agent
          </p>
          <p className="text-sm text-muted-foreground">
            Crée un premier agent pour commencer à générer et publier des posts
            LinkedIn.
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
