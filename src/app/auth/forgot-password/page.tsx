"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type AuthState } from "../actions";

const initial: AuthState = { ok: false };
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, initial);
  const [email, setEmail] = React.useState("");

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/80">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
        <CardDescription>
          Reçois un lien sécurisé par e-mail pour le réinitialiser
        </CardDescription>
      </CardHeader>

      {state?.ok ? (
        <>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 text-primary shrink-0" />
              <p className="text-foreground/80">{state.message}</p>
            </div>
            <ResendButton email={email} />
          </CardContent>
          <CardFooter className="justify-center">
            <Link
              href="/auth/login"
              className={buttonVariants({
                variant: "outline",
                className: "w-full",
              })}
            >
              <ArrowLeft className="size-4" />
              Retour à la connexion
            </Link>
          </CardFooter>
        </>
      ) : (
        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            {state?.message && !state.ok ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <SubmitButton>Envoyer le lien</SubmitButton>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Retour à la connexion
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function ResendButton({ email }: { email: string }) {
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [cooldown]);

  const handle = () => {
    if (!email || cooldown > 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);
      const result = await requestPasswordReset(undefined, fd);
      if (result.ok) {
        toast.success("Lien renvoyé.");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        toast.error(result.message ?? "Erreur lors du renvoi.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={pending || cooldown > 0 || !email}
      className="w-full"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RefreshCw className="size-3.5" />
      )}
      {cooldown > 0 ? `Renvoyer le lien dans ${cooldown}s` : "Renvoyer le lien"}
    </Button>
  );
}
