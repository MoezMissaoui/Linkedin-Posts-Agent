"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Loader2, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  postLink: string | null;
  onDelete: () => Promise<void>;
};

export function PostActions({ postLink, onDelete }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await onDelete();
        toast.success("Post supprimé.");
        router.push("/posts");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur inattendue.");
        setConfirm(false);
      }
    });
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        <span>Supprimer ce post définitivement ?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirm(false)}
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleDelete}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Oui, supprimer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {postLink ? (
        <a
          href={postLink}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLink className="size-3.5" />
          LinkedIn
        </a>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirm(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
        Supprimer
      </Button>
    </div>
  );
}
