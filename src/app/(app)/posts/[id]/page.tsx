import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Calendar,
  ExternalLink,
  ImageOff,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { PostActions } from "../_components/post-actions";
import { deletePost } from "../actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type PostDetail = {
  id: string;
  agent_id: string;
  post_text: string | null;
  raw_code: string | null;
  image_url: string | null;
  post_link: string | null;
  is_published: boolean;
  created_at: string;
  agents: { id: string; title: string | null; user_id: string } | null;
};

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: row, error } = await supabase
    .from("linkedin_posts")
    .select(
      "id, agent_id, post_text, raw_code, image_url, post_link, is_published, created_at, agents!inner(id, title, user_id)",
    )
    .eq("id", id)
    .eq("agents.user_id", user.id)
    .maybeSingle();

  if (error || !row) notFound();
  const post = row as unknown as PostDetail;

  // Bound server action for client-side action button.
  const boundDelete = async () => {
    "use server";
    await deletePost(id);
  };

  const agentTitle = post.agents?.title || "Agent sans titre";
  const text = (post.post_text ?? "").trim();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Posts
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/agents/${post.agent_id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-secondary-foreground hover:bg-secondary/80"
            >
              <Bot className="size-3.5" />
              {agentTitle}
            </Link>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                post.is_published
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  post.is_published ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {post.is_published ? "Publié" : "Brouillon"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              <time dateTime={post.created_at}>
                {dateFmt.format(new Date(post.created_at))}
              </time>
            </span>
          </div>

          <PostActions
            postLink={post.post_link}
            onDelete={boundDelete}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Image */}
        <Card className="overflow-hidden lg:col-span-2 lg:order-2">
          <div className="bg-muted">
            {post.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.image_url}
                alt=""
                className="h-auto w-full"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground/60">
                <div className="flex flex-col items-center gap-2">
                  <ImageOff className="size-10" />
                  <p className="text-sm">Pas d&apos;image</p>
                </div>
              </div>
            )}
          </div>
          {post.post_link ? (
            <CardContent className="p-4">
              <a
                href={post.post_link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full",
                )}
              >
                <ExternalLink className="size-3.5" />
                Voir sur LinkedIn
              </a>
            </CardContent>
          ) : null}
        </Card>

        {/* Texte */}
        <Card className="lg:col-span-3 lg:order-1">
          <CardHeader>
            <CardTitle>Contenu de la publication</CardTitle>
            <CardDescription>Texte tel qu&apos;il est publié</CardDescription>
          </CardHeader>
          <CardContent>
            {text ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {text}
              </p>
            ) : (
              <p className="italic text-sm text-muted-foreground">Aucun texte.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw code */}
      {post.raw_code ? (
        <Card>
          <CardHeader>
            <CardTitle>Code source</CardTitle>
            <CardDescription>Snippet utilisé pour générer l&apos;image</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/40 p-4 text-xs font-mono leading-relaxed">
              <code>{post.raw_code}</code>
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
