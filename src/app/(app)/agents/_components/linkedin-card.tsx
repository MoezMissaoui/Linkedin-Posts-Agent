"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Link2,
  Loader2,
  PowerOff,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LinkedinTestResult } from "../actions";

const FLASH_MESSAGES: Record<
  string,
  { kind: "success" | "error"; text: string }
> = {
  connected: { kind: "success", text: "Compte LinkedIn connecté avec succès." },
  expired: { kind: "error", text: "La session OAuth a expiré, relance la connexion." },
  invalid_state: { kind: "error", text: "État OAuth invalide (CSRF). Réessaie." },
  user_cancelled_login: { kind: "error", text: "Tu as annulé la connexion LinkedIn." },
  user_cancelled_authorize: { kind: "error", text: "Tu as refusé d'autoriser l'application." },
  access_denied: { kind: "error", text: "LinkedIn a refusé l'autorisation." },
  exchange_error: { kind: "error", text: "Échec de l'échange du code contre un token." },
  db_error: { kind: "error", text: "Token reçu, mais la sauvegarde en base a échoué." },
};

type Member = {
  name: string | null;
  picture: string | null;
  connectedAt: string | null;
};

type Props = {
  agentId: string;
  member: Member | null;
  returnTo?: "edit" | "list";
  onDisconnect: () => Promise<void>;
  onTest: () => Promise<LinkedinTestResult>;
};

export function LinkedinCard({
  agentId,
  member,
  returnTo = "edit",
  onDisconnect,
  onTest,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [testing, startTest] = React.useTransition();

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

    const params = new URLSearchParams(searchParams.toString());
    params.delete("linkedin");
    const qs = params.toString();
    router.replace(
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      { scroll: false },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connected = member !== null;
  const connectHref =
    `/api/linkedin/connect/${agentId}` +
    (returnTo === "list" ? "?return=list" : "");

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
          <ConnectedAccount member={member} />
        ) : (
          <NotConnected />
        )}

        {confirmDisconnect ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-slide-in-right">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testing}
                  onClick={() =>
                    startTest(async () => {
                      const r = await onTest();
                      if (r.ok) toast.success(r.message);
                      else toast.error(r.message);
                      router.refresh();
                    })
                  }
                >
                  {testing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CircleHelp className="size-4" />
                  )}
                  Tester
                </Button>
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
                  size="sm"
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
          Permissions :{" "}
          <code className="font-mono">openid profile email w_member_social</code>.
        </p>
      </CardContent>
    </Card>
  );
}

function ConnectedAccount({ member }: { member: Member }) {
  const initials =
    (member.name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-3">
      <Avatar src={member.picture} initials={initials} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <p className="truncate text-sm font-medium">
            {member.name ?? "Compte LinkedIn"}
          </p>
        </div>
        {member.connectedAt ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3" />
            Connecté {connectedSince(member.connectedAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NotConnected() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      <span>Aucun compte connecté. L&apos;agent ne peut pas encore publier.</span>
    </div>
  );
}

function Avatar({
  src,
  initials,
}: {
  src: string | null;
  initials: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full brand-gradient text-sm font-semibold text-white"
    >
      {initials}
    </div>
  );
}

function connectedSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "aujourd'hui";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an(s)`;
}
