"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteAgent } from "../actions";

// Delete control on the agent card (list view). Opens a modal popup to confirm,
// then calls the (non-redirecting) deleteAgent action and refreshes the list.
export function AgentCardActions({
  agentId,
  title,
}: {
  agentId: string;
  title: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteAgent(agentId);
        toast.success("Agent supprimé.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur inattendue.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Supprimer l'agent"
        title="Supprimer l'agent"
        className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Supprimer
      </button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirmer la suppression"
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <div
                onClick={() => {
                  if (!pending) setOpen(false);
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-page-in"
              />
              <div className="relative w-full max-w-sm rounded-xl border border-border/60 bg-card p-6 shadow-2xl animate-pop-in">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">
                      Supprimer l&apos;agent
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cette action est irréversible. L&apos;agent{" "}
                      {title ? (
                        <span className="font-medium text-foreground">
                          « {title} »
                        </span>
                      ) : (
                        "sélectionné"
                      )}{" "}
                      ainsi que ses plannings seront définitivement supprimés.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    disabled={pending}
                    variant="outline"
                    onClick={handleDelete}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Supprimer
                  </Button>
                  <Button
                    type="button"
                    autoFocus
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
