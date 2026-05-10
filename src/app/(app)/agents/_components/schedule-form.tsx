"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { AgentFormState } from "../actions";

const PRESETS: { label: string; cron: string }[] = [
  { label: "Tous les jours à 09h", cron: "0 9 * * *" },
  { label: "Tous les jours à 10h30", cron: "30 10 * * *" },
  { label: "En semaine à 09h", cron: "0 9 * * 1-5" },
  { label: "Lundi à 09h", cron: "0 9 * * 1" },
  { label: "Toutes les 6h", cron: "0 */6 * * *" },
];

const COMMON_TZ = [
  "UTC",
  "Africa/Tunis",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Cairo",
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
];

export type ScheduleConfigRow = {
  id: string;
  custom_cron: string | null;
  timezone: string | null;
};

type AddAction = (
  state: AgentFormState | undefined,
  formData: FormData,
) => Promise<AgentFormState>;

type UpdateAction = (
  configId: string,
  state: AgentFormState | undefined,
  formData: FormData,
) => Promise<AgentFormState>;

type DeleteAction = (configId: string) => Promise<void>;

type Props = {
  agentId: string;
  configs: ScheduleConfigRow[];
  addAction: AddAction;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
};

export function ScheduleSection({
  configs,
  addAction,
  updateAction,
  deleteAction,
}: Props) {
  const [allTimezones, setAllTimezones] = React.useState<string[]>(COMMON_TZ);
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    try {
      const fn = (
        Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
      ).supportedValuesOf;
      if (typeof fn === "function") {
        const list = fn("timeZone");
        if (list && list.length) setAllTimezones(list);
      }
    } catch {
      /* keep fallback */
    }
  }, []);

  const hasConfigs = configs.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-4" />
          </div>
          <div className="flex-1">
            <CardTitle>Planning</CardTitle>
            <CardDescription>
              Un agent peut avoir plusieurs schedules — chaque cron tourne dans
              sa propre timezone.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
            hasConfigs
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              hasConfigs ? "bg-emerald-500" : "bg-muted-foreground/60",
            )}
          />
          <span>
            {hasConfigs
              ? `${configs.length} planning${configs.length > 1 ? "s" : ""} actif${configs.length > 1 ? "s" : ""}.`
              : "Aucun planning. Ajoute un cron + une timezone pour activer la planification."}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {configs.map((c) => (
            <li key={c.id}>
              <ScheduleRow
                config={c}
                allTimezones={allTimezones}
                updateAction={updateAction}
                deleteAction={deleteAction}
              />
            </li>
          ))}
        </ul>

        {adding ? (
          <ScheduleEditForm
            mode="add"
            allTimezones={allTimezones}
            initialCron=""
            initialTimezone="UTC"
            onSubmitAction={addAction}
            onDone={() => setAdding(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="self-start"
          >
            <Plus className="size-3.5" />
            Ajouter un planning
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// -------- Row --------

function ScheduleRow({
  config,
  allTimezones,
  updateAction,
  deleteAction,
}: {
  config: ScheduleConfigRow;
  allTimezones: string[];
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (editing) {
    const wrapped: AddAction = (state, formData) =>
      updateAction(config.id, state, formData);
    return (
      <ScheduleEditForm
        mode="edit"
        allTimezones={allTimezones}
        initialCron={config.custom_cron ?? ""}
        initialTimezone={config.timezone ?? "UTC"}
        onSubmitAction={wrapped}
        onDone={() => setEditing(false)}
      />
    );
  }

  const cron = config.custom_cron ?? "";
  const tz = config.timezone ?? "UTC";

  return (
    <div className="rounded-md border border-border/60 p-3">
      {confirmDelete ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-destructive animate-slide-in-right">
          <AlertTriangle className="size-4" />
          <span>Supprimer ce planning ?</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmDelete(false)}
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
                  await deleteAction(config.id);
                  toast.success("Planning supprimé.");
                  setConfirmDelete(false);
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
            Oui
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-sm font-mono">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>{cron || <span className="italic">cron vide</span>}</span>
              <span className="text-muted-foreground">·</span>
              <Globe className="size-3.5 text-muted-foreground" />
              <span>{tz}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {humanize(cron, tz)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              Éditer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------- Edit form (used for both Add and Edit) --------

function ScheduleEditForm({
  mode,
  allTimezones,
  initialCron,
  initialTimezone,
  onSubmitAction,
  onDone,
}: {
  mode: "add" | "edit";
  allTimezones: string[];
  initialCron: string;
  initialTimezone: string;
  onSubmitAction: AddAction;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(onSubmitAction, {
    ok: false,
  } as AgentFormState);
  const [cron, setCron] = React.useState(initialCron);
  const [timezone, setTimezone] = React.useState(initialTimezone || "UTC");

  React.useEffect(() => {
    if (state?.ok && state.message) {
      toast.success(state.message);
      router.refresh();
      onDone();
    } else if (state?.message && !state.ok) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 p-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cron-${mode}`}>Expression cron</Label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`cron-${mode}`}
            name="custom_cron"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="30 10 * * *"
            className={cn(
              "pl-9 font-mono",
              state?.fieldErrors?.custom_cron
                ? "border-destructive focus-visible:ring-destructive"
                : "",
            )}
            required
          />
        </div>
        {state?.fieldErrors?.custom_cron ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.custom_cron}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Format : <code className="font-mono">minute heure jour mois jour-semaine</code>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.cron}
              type="button"
              onClick={() => setCron(p.cron)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                cron === p.cron
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`tz-${mode}`}>Timezone</Label>
        <div className="relative">
          <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`tz-${mode}`}
            name="timezone"
            list={`tz-list-${mode}`}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Africa/Tunis"
            className={cn(
              "pl-9",
              state?.fieldErrors?.timezone
                ? "border-destructive focus-visible:ring-destructive"
                : "",
            )}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <datalist id={`tz-list-${mode}`}>
            {allTimezones.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
        </div>
        {state?.fieldErrors?.timezone ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.timezone}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          {cron ? humanize(cron, timezone) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            <X className="size-3.5" />
            Annuler
          </Button>
          <SubmitButton mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ mode }: { mode: "add" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      {mode === "add" ? "Ajouter" : "Mettre à jour"}
    </Button>
  );
}

function humanize(cron: string, tz: string): string | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [m, h, dom, mon, dow] = parts;
  const isStar = (s: string) => s === "*";
  const isNum = (s: string) => /^\d+$/.test(s);

  if (isNum(m) && isNum(h) && isStar(dom) && isStar(mon) && isStar(dow)) {
    return `Tous les jours à ${h.padStart(2, "0")}:${m.padStart(2, "0")} (${tz})`;
  }
  if (isNum(m) && isNum(h) && isStar(dom) && isStar(mon) && isNum(dow)) {
    const days = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];
    return `${days[Number(dow) % 7]} à ${h.padStart(2, "0")}:${m.padStart(2, "0")} (${tz})`;
  }
  return `${cron} · ${tz}`;
}
