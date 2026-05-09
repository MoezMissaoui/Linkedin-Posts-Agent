import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Newspaper,
  Plus,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return dateFmt.format(new Date(iso));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const meta = user.user_metadata ?? {};
  const greeting =
    (typeof meta.display_name === "string" && meta.display_name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    user.email?.split("@")[0] ||
    "";

  const [
    { count: totalAgents },
    { count: totalPosts },
    { count: publishedPosts },
    { data: recentPosts },
    { data: recentAgents },
  ] = await Promise.all([
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase
      .from("linkedin_posts")
      .select("*, agents!inner(user_id)", { count: "exact", head: true })
      .eq("agents.user_id", user.id),
    supabase
      .from("linkedin_posts")
      .select("*, agents!inner(user_id)", { count: "exact", head: true })
      .eq("agents.user_id", user.id)
      .eq("is_published", true),
    supabase
      .from("linkedin_posts")
      .select(
        "id, post_text, image_url, post_link, is_published, created_at, agents!inner(id, title, user_id)",
      )
      .eq("agents.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("agents")
      .select(
        "id, title, post_subject, schedule, enable_post_picture, updated_at, created_at",
      )
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(4),
  ]);

  const draftPosts = (totalPosts ?? 0) - (publishedPosts ?? 0);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <header>
        <p className="text-sm text-muted-foreground">Tableau de bord</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Bonjour, <span className="brand-text">{greeting}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d&apos;ensemble de tes agents et de leurs publications.
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Bot className="size-4" />}
          label="Agents"
          value={totalAgents ?? 0}
        />
        <Kpi
          icon={<Newspaper className="size-4" />}
          label="Posts totaux"
          value={totalPosts ?? 0}
        />
        <Kpi
          icon={<CheckCircle2 className="size-4" />}
          label="Publiés"
          value={publishedPosts ?? 0}
          accent="emerald"
        />
        <Kpi
          icon={<Clock className="size-4" />}
          label="Brouillons"
          value={Math.max(0, draftPosts)}
          accent="amber"
        />
      </section>

      {/* Two columns: recent posts (wider) + agents (sidebar) */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent posts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Posts récents</CardTitle>
              <CardDescription>5 derniers, tous agents confondus</CardDescription>
            </div>
            <Link
              href="/posts"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Voir tout
              <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
            {recentPosts && recentPosts.length > 0 ? (
              recentPosts.map((p) => <PostRow key={p.id} post={p} />)
            ) : (
              <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Aucun post pour le moment.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Agents */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Mes agents</CardTitle>
              <CardDescription>{totalAgents ?? 0} configuré{(totalAgents ?? 0) > 1 ? "s" : ""}</CardDescription>
            </div>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Voir tout
              <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-3 pt-0 sm:p-4 sm:pt-0">
            {recentAgents && recentAgents.length > 0 ? (
              recentAgents.map((a) => <AgentRow key={a.id} agent={a} />)
            ) : (
              <Link
                href="/agents/new"
                className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              >
                <Plus className="size-4" />
                Créer un premier agent
              </Link>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const accentClasses =
    accent === "emerald"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-primary/10 text-primary";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            accentClasses,
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function PostRow({
  post,
}: {
  post: {
    id: string;
    post_text: string | null;
    image_url: string | null;
    post_link: string | null;
    is_published: boolean;
    created_at: string;
    agents: { id: string; title: string | null; user_id: string } | null;
  };
}) {
  const text = (post.post_text ?? "").trim();
  const excerpt = text.length > 130 ? `${text.slice(0, 130)}…` : text;
  const agentTitle = post.agents?.title || "Agent";

  return (
    <div className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-accent/40">
      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted sm:size-16">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground/50">
            <FileText className="size-5" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
            <Bot className="size-3" />
            {agentTitle}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              post.is_published
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            )}
          >
            {post.is_published ? "Publié" : "Brouillon"}
          </span>
          <time dateTime={post.created_at}>{relativeTime(post.created_at)}</time>
        </div>
        <p className="line-clamp-2 text-sm text-foreground/90">
          {excerpt || (
            <span className="italic text-muted-foreground">Sans texte.</span>
          )}
        </p>
        {post.post_link ? (
          <a
            href={post.post_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            LinkedIn
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AgentRow({
  agent,
}: {
  agent: {
    id: string;
    title: string | null;
    post_subject: string | null;
    schedule: boolean;
    enable_post_picture: boolean;
    updated_at: string | null;
    created_at: string;
  };
}) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/40"
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg brand-gradient text-white"
        aria-hidden
      >
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {agent.title || "Sans titre"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {agent.post_subject || (
            <span className="italic">Aucun sujet</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {agent.schedule ? (
          <CalendarClock
            className="size-3.5 text-muted-foreground"
            aria-label="Planifié"
          />
        ) : null}
        {agent.enable_post_picture ? (
          <ImageIcon
            className="size-3.5 text-muted-foreground"
            aria-label="Image activée"
          />
        ) : null}
      </div>
    </Link>
  );
}
