"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Mail, User } from "lucide-react";
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
import { updateProfile, type FormState } from "../actions";

const initial: FormState = { ok: false };

type Props = {
  email: string;
  fullName: string;
  emailConfirmed: boolean;
};

export function ProfileForm({ email, fullName, emailConfirmed }: Props) {
  const [state, formAction] = useActionState(updateProfile, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Tes informations publiques au sein de Postilys
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                value={email}
                readOnly
                disabled
                className="pl-9"
              />
              {emailConfirmed ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  vérifié
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Le changement d&apos;e-mail sera proposé dans une prochaine
              itération.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={fullName}
                placeholder="Comment veux-tu apparaître ?"
                maxLength={80}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Enregistrer
    </Button>
  );
}
