"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  PowerOff,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const FLASH_MESSAGES: Record<string, { kind: "success" | "error"; text: string }> = {
  connected: {
    kind: "success",
    text: "Compte LinkedIn connecté avec succès.",
  },
  expired: {
    kind: "error",
    text: "La session OAuth a expiré, relance la connexion.",
  },
  invalid_state: {
    kind: "error",
    text: "État OAuth invalide (CSRF). Réessaie.",
  },
  user_cancelled_login: {
    kind: "error",
    text: "Tu as annulé la connexion LinkedIn.",
  },
  user_cancelled_authorize: {
    kind: "error",
    text: "Tu as refusé d'autoriser l'application.",
  },
  access_denied: {
    kind: "error",
    text: "LinkedIn a refusé l'autorisation.",
  },
  exchange_error: {
    kind: "error",
    text: "Échec de l'échange du code contre un token.",
  },
  db_error: {
    kind: "error",
    text: "Token reçu, mais la sauvegarde en base a échoué.",
  },
};

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  agentId: string;
  connected: boolean;
  onDisconnect: () => Promise<void>;
};

export function LinkedinCard({ agentId, connected, onDisconnect }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // One-shot toast based on the OAuth callback redirect (?linkedin=<status>).
  React.useEffect(() => {
    const status = searchParams.get("linkedin");
    if (!status) return;
    const flash = FLASH_MESSAGES[status] ?? {
      kind: "error" as const,
      text: `LinkedIn : ${status}`,
    };
    if (flash.kind === "success") toast.success(flash.text);
    else toast.error(flash.text);

    // Strip the param so the toast doesn't fire again on a refresh.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("linkedin");
    const qs = params.toString();
    router.replace(`/agents/${agentId}${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectHref = `/api/linkedin/connect/${agentId}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-[#0A66C2]/10 text-[#0A66C2]">
            <Link2 className="size-4" />
          </div>
          <div className="flex-1">
            <CardTitle>LinkedIn</CardTitle>
            <CardDescription>
              Autorise l&apos;agent à publier sur ton compte LinkedIn.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {connected ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>
              Compte LinkedIn connecté. L&apos;agent peut publier en ton nom.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground/60" />
            <span>
              Aucun compte connecté. L&apos;agent ne peut pas encore publier.
            </span>
          </div>
        )}

        {confirmDisconnect ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            <span>Déconnecter LinkedIn et effacer le token ?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmDisconnect(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                startTransition(async () => {
                  try {
                    await onDisconnect();
                    toast.success("LinkedIn déconnecté.");
                    setConfirmDisconnect(false);
                    router.refresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Erreur inattendue.",
                    );
                  }
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Oui, déconnecter
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <>
                <a
                  href={connectHref}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0A66C2] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#004182]"
                >
                  <RefreshCw className="size-4" />
                  Reconnecter
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDisconnect(true)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <PowerOff className="size-4" />
                  Déconnecter
                </Button>
              </>
            ) : (
              <a
                href={connectHref}
                className="inline-flex items-center gap-2 rounded-md bg-[#0A66C2] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#004182]"
              >
                <Link2 className="size-4" />
                Connecter à LinkedIn
              </a>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Permissions demandées :{" "}
          <code className="font-mono">openid profile email w_member_social</code>
          . Le token est stocké dans <code className="font-mono">agents.linkedin_access_token</code>.
        </p>
      </CardContent>
    </Card>
  );
}
