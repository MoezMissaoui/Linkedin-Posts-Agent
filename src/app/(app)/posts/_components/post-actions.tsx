"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  postLink: string | null;
  onRepublish: () => Promise<void>;
  onDelete: () => Promise<void>;
};

type ConfirmKind = "republish" | "delete" | null;

export function PostActions({ postLink, onRepublish, onDelete }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState<ConfirmKind>(null);
  const [pending, startTransition] = React.useTransition();

  const handle = (kind: Exclude<ConfirmKind, null>) => {
    startTransition(async () => {
      try {
        if (kind === "republish") {
          await onRepublish();
          toast.success("Post renvoyé en file d'attente.");
          router.refresh();
        } else {
          await onDelete();
          toast.success("Post supprimé.");
          // deletePost performs its own redirect via server action
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur inattendue.";
        toast.error(msg);
      } finally {
        setConfirm(null);
      }
    });
  };

  if (confirm) {
    const isDelete = confirm === "delete";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
          isDelete
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        )}
      >
        <AlertTriangle className="size-4 shrink-0" />
        <span>
          {isDelete
            ? "Supprimer ce post définitivement ?"
            : "Renvoyer ce post à l'agent pour publication ?"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirm(null)}
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => handle(confirm)}
          className={cn(
            isDelete
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "",
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isDelete ? "Oui, supprimer" : "Oui, republier"}
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
        onClick={() => setConfirm("republish")}
      >
        <RotateCcw className="size-3.5" />
        Republier
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirm("delete")}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
        Supprimer
      </Button>
    </div>
  );
}
