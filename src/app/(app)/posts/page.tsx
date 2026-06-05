import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, ImageOff, Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 6;

type SearchParams = { agent?: string; page?: string };

type PostRow = {
  id: string;
  agent_id: string;
  post_text: string | null;
  image_url: string | null;
  post_link: string | null;
  is_published: boolean;
  created_at: string;
  agents: { id: string; title: string | null; user_id: string } | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
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
  return dateFormatter.format(new Date(iso));
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { agent: selectedAgent, page: pageParam } = await searchParams;

  // Fetch agents for the filter pills.
  const { data: agentsRows } = await supabase
    .from("agents")
    .select("id, title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const agents = agentsRows ?? [];

  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch posts joined with agents, scoped to current user.
  let query = supabase
    .from("linkedin_posts")
    .select(
      "id, agent_id, post_text, image_url, post_link, is_published, created_at, agents!inner(id, title, user_id)",
      { count: "exact" },
    )
    .eq("agents.user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedAgent) {
    query = query.eq("agent_id", selectedAgent);
  }

  const { data: postsRaw, count, error } = await query;
  const posts = ((postsRaw as unknown as PostRow[]) ?? []).filter(
    (p) => p.agents !== null,
  );

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);

  const paginationParams = new URLSearchParams();
  if (selectedAgent) paginationParams.set("agent", selectedAgent);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Publications</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Publications LinkedIn
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total === 0
            ? "Aucune publication pour le moment."
            : `${total} publication${total > 1 ? "s" : ""} ${selectedAgent ? "pour cet agent" : "tous agents confondus"}.`}
        </p>
      </header>

      {agents.length > 0 ? (
        <nav className="-mx-1 flex flex-wrap gap-2">
          <FilterPill href="/posts" active={!selectedAgent} label="Tous" />
          {agents.map((a) => (
            <FilterPill
              key={a.id}
              href={`/posts?agent=${a.id}`}
              active={selectedAgent === a.id}
              label={a.title || "Agent sans titre"}
            />
          ))}
        </nav>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erreur lors du chargement : {error.message}
        </p>
      ) : total === 0 ? (
        <EmptyState hasAgents={agents.length > 0} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            basePath="/posts"
            searchParams={paginationParams}
          />
        </>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function PostCard({ post }: { post: PostRow }) {
  const agentTitle = post.agents?.title || "Agent sans titre";
  const text = post.post_text?.trim() ?? "";
  const excerpt = text.length > 240 ? `${text.slice(0, 240)}…` : text;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-foreground/30">
        <div className="relative aspect-[16/10] w-full bg-muted">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
              <ImageOff className="size-8" />
            </div>
          )}
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-md",
              post.is_published
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/15 text-amber-200",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                post.is_published ? "bg-emerald-400" : "bg-amber-400",
              )}
            />
            {post.is_published ? "Publié" : "Brouillon"}
          </span>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
              <Bot className="size-3" />
              {agentTitle}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={post.created_at} title={post.created_at}>
              {relativeTime(post.created_at)}
            </time>
          </div>

          <p className="text-sm leading-relaxed text-foreground/90 line-clamp-5">
            {excerpt || (
              <span className="italic text-muted-foreground">Sans texte.</span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ hasAgents }: { hasAgents: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Inbox className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Aucune publication à afficher</p>
          <p className="text-sm text-muted-foreground">
            {hasAgents
              ? "Tes agents n'ont rien publié pour l'instant."
              : "Crée un agent pour commencer à générer des publications."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
