"use client";

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type FormState } from "../actions";

const initial: FormState = { ok: false };

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, initial);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) {
        toast.success(state.message);
        formRef.current?.reset();
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
        <CardDescription>
          Modifie ton mot de passe — il faudra ressaisir l&apos;actuel pour
          confirmer
        </CardDescription>
      </CardHeader>
      <form ref={formRef} action={formAction}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <PasswordField
              id="current_password"
              name="current_password"
              autoComplete="current-password"
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <PasswordField
              id="new_password"
              name="new_password"
              autoComplete="new-password"
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              minLength={8}
              placeholder="8 caractères minimum"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirmer</Label>
            <PasswordField
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              minLength={8}
              placeholder="Retape le nouveau mot de passe"
              required
            />
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function PasswordField({
  id,
  name,
  autoComplete,
  show,
  onToggle,
  minLength,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  minLength?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        required={required}
        className="pl-9 pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <KeyRound className="size-4" />
      )}
      Mettre à jour
    </Button>
  );
}
