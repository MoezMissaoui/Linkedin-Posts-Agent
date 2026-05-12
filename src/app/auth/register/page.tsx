"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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
import {
  resendSignupConfirmation,
  signUp,
  type AuthState,
} from "../actions";

const initial: AuthState = { ok: false };
const RESEND_COOLDOWN_SECONDS = 60;

export default function RegisterPage() {
  const [state, formAction] = useActionState(signUp, initial);
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");

  if (state?.ok && state.message) {
    return (
      <Card className="border-border/60 backdrop-blur-sm bg-card/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid place-items-center size-12 rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Vérifie ta boîte mail</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResendConfirmationButton email={email} />
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/auth/login"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Retour à la connexion
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 backdrop-blur-sm bg-card/80">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>
          Lance ton premier agent en moins d&apos;une minute
        </CardDescription>
      </CardHeader>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="8 caractères minimum"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Retape ton mot de passe"
                className="pl-9"
              />
            </div>
          </div>

          <SubmitButton>Créer mon compte</SubmitButton>
        </CardContent>
      </form>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/auth/login"
          className="ml-1 font-medium text-foreground hover:underline"
        >
          Se connecter
        </Link>
      </CardFooter>
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

function ResendConfirmationButton({ email }: { email: string }) {
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
      const result = await resendSignupConfirmation(undefined, fd);
      if (result.ok) {
        toast.success("E-mail de confirmation renvoyé.");
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
      {cooldown > 0
        ? `Renvoyer l'e-mail dans ${cooldown}s`
        : "Renvoyer l'e-mail de confirmation"}
    </Button>
  );
}
