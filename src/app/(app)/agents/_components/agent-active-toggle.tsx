"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toggleAgentActive } from "../actions";

type Props = {
  agentId: string;
  active: boolean;
  canActivate: boolean;
  reason?: string;
  className?: string;
};

export function AgentActiveToggle({
  agentId,
  active,
  canActivate,
  reason,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useState(active);

  // Sync if the parent prop changes (e.g. after router.refresh()).
  React.useEffect(() => {
    setOptimistic(active);
  }, [active]);

  const blocked = !optimistic && !canActivate;

  const handleChange = (next: boolean) => {
    if (next && !canActivate) {
      toast.error(
        reason ?? "Conditions non remplies pour activer cet agent.",
      );
      return;
    }
    setOptimistic(next);
    startTransition(async () => {
      const result = await toggleAgentActive(agentId, next);
      if (!result.ok) {
        toast.error(result.message ?? "Erreur");
        setOptimistic(active); // revert
      } else {
        toast.success(result.message ?? "Mis à jour");
        router.refresh();
      }
    });
  };

  const labelText = optimistic ? "Actif" : "Inactif";
  const title = blocked ? reason : undefined;

  return (
    <div className={cn("flex items-center gap-2", className)} title={title}>
      <span
        className={cn(
          "text-[11px] font-medium uppercase tracking-wider transition-colors",
          optimistic
            ? "text-emerald-600 dark:text-emerald-400"
            : blocked
              ? "text-muted-foreground/60"
              : "text-muted-foreground",
        )}
      >
        {labelText}
      </span>
      <Switch
        checked={optimistic}
        disabled={pending || blocked}
        onCheckedChange={handleChange}
        aria-label={
          optimistic ? "Désactiver l'agent" : "Activer l'agent"
        }
      />
    </div>
  );
}
