"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/supabase/types";
import type { AgentFormState } from "../actions";

const CHANNEL_OPTIONS = [
  { value: "", label: "Aucun" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
] as const;

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  action: (
    state: AgentFormState | undefined,
    formData: FormData,
  ) => Promise<AgentFormState>;
  initial?: Partial<Agent>;
  onDelete?: () => Promise<void>;
};

const initialState: AgentFormState = { ok: false };

export function AgentForm({ mode, action, initial, onDelete }: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const router = useRouter();

  React.useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  const linkedinPresent = Boolean(initial?.linkedin_access_token);
  const telegramTokenPresent = Boolean(initial?.telegram_bot_token);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.message && !state.ok ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {/* ---------------- Général ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Général</CardTitle>
          <CardDescription>
            Identité et instructions de l&apos;agent
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field
            id="title"
            label="Titre"
            required
            error={state?.fieldErrors?.title}
          >
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title ?? ""}
              maxLength={120}
              placeholder="Laravel Tip"
              required
            />
          </Field>

          <Field
            id="prompt_system"
            label="Prompt système"
            hint="Instructions complètes pour le LLM (ton, contraintes, format de sortie…)"
          >
            <Textarea
              id="prompt_system"
              name="prompt_system"
              defaultValue={initial?.prompt_system ?? ""}
              rows={10}
              placeholder="You are an expert..."
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Publication ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Publication</CardTitle>
          <CardDescription>
            Comportement de génération
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleRow
            id="enable_post_picture"
            name="enable_post_picture"
            label="Générer une image avec chaque post"
            hint="Si activé, l'agent crée un visuel à partir du raw_code"
            defaultChecked={initial?.enable_post_picture ?? false}
          />
        </CardContent>
      </Card>

      {/* ---------------- Channels ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Canaux</CardTitle>
          <CardDescription>
            Comment recevoir les approbations et confirmations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field
            id="approval_channel"
            label="Canal d'approbation"
            hint="Avant publication"
          >
            <SelectChannel
              id="approval_channel"
              name="approval_channel"
              defaultValue={initial?.approval_channel ?? ""}
            />
          </Field>
          <Field
            id="confirmation_channel"
            label="Canal de confirmation"
            hint="Après publication"
          >
            <SelectChannel
              id="confirmation_channel"
              name="confirmation_channel"
              defaultValue={initial?.confirmation_channel ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Notification e-mail ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>E-mail</CardTitle>
          <CardDescription>
            Adresse à utiliser quand un canal e-mail est sélectionné
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field id="email" label="E-mail" error={state?.fieldErrors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              maxLength={200}
              placeholder="vous@exemple.com"
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- LinkedIn ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn</CardTitle>
          <CardDescription>
            Token d&apos;accès pour publier sur ton compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecretField
            id="linkedin_access_token"
            label="Access token LinkedIn"
            mode={mode}
            present={linkedinPresent}
            clearName="linkedin_clear"
          />
        </CardContent>
      </Card>

      {/* ---------------- Telegram ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram</CardTitle>
          <CardDescription>
            Bot et chat utilisés pour les approbations / confirmations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <SecretField
            id="telegram_bot_token"
            label="Bot token"
            mode={mode}
            present={telegramTokenPresent}
            clearName="telegram_clear"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="telegram_chat_id" label="Chat ID">
              <Input
                id="telegram_chat_id"
                name="telegram_chat_id"
                defaultValue={initial?.telegram_chat_id ?? ""}
                maxLength={200}
                placeholder="614773010"
              />
            </Field>
            <Field
              id="telegram_start_command"
              label="Commande de démarrage"
              hint="Ex. : GO"
            >
              <Input
                id="telegram_start_command"
                name="telegram_start_command"
                defaultValue={initial?.telegram_start_command ?? ""}
                maxLength={200}
                placeholder="GO"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Footer ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <div className="flex items-center gap-2">
          {mode === "edit" && onDelete ? (
            <DeleteButton onConfirm={onDelete} />
          ) : null}
          <SubmitButton mode={mode} />
        </div>
      </div>
    </form>
  );
}

// ---- helpers ----

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SelectChannel({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {CHANNEL_OPTIONS.map((opt) => (
        <option key={opt.value || "none"} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({
  id,
  name,
  label,
  hint,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Switch id={id} name={name} defaultChecked={defaultChecked} />
    </div>
  );
}

function SecretField({
  id,
  label,
  mode,
  present,
  clearName,
}: {
  id: string;
  label: string;
  mode: Mode;
  present: boolean;
  clearName: string;
}) {
  const [show, setShow] = React.useState(false);
  const [clear, setClear] = React.useState(false);

  const placeholder =
    mode === "edit"
      ? present
        ? "•••• (laisse vide pour conserver)"
        : "Aucun token enregistré"
      : "Colle ton token ici";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          maxLength={1000}
          placeholder={placeholder}
          disabled={clear}
          className={cn("pr-10", clear ? "opacity-50" : "")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Masquer" : "Afficher"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {mode === "edit" && present ? (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name={clearName}
            checked={clear}
            onChange={(e) => setClear(e.target.checked)}
            className="size-3.5 rounded border-input"
          />
          Effacer le token actuel
        </label>
      ) : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      {mode === "create" ? "Créer l'agent" : "Enregistrer"}
    </Button>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
        Supprimer
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm">
      <AlertTriangle className="size-4 text-destructive" />
      <span className="text-destructive">Confirmer ?</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Annuler
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => onConfirm())}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Oui, supprimer
      </Button>
    </div>
  );
}
