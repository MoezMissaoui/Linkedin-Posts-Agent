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
  Info,
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

type CronParts = [string, string, string, string, string];

function splitCron(value: string | null | undefined): CronParts {
  const parts = (value ?? "").trim().split(/\s+/);
  return [
    parts[0] || "*",
    parts[1] || "*",
    parts[2] || "*",
    parts[3] || "*",
    parts[4] || "*",
  ];
}

function joinCron(parts: CronParts): string {
  return parts.map((p) => (p.trim() === "" ? "*" : p.trim())).join(" ");
}

const CRON_FIELDS: {
  label: string;
  min: number;
  max: number;
  range: string;
  placeholder: string;
}[] = [
  { label: "Minute", min: 0, max: 59, range: "0–59", placeholder: "*" },
  { label: "Heure", min: 0, max: 23, range: "0–23", placeholder: "*" },
  { label: "Jour du mois", min: 1, max: 31, range: "1–31", placeholder: "*" },
  { label: "Mois", min: 1, max: 12, range: "1–12", placeholder: "*" },
  {
    label: "Jour de semaine",
    min: 0,
    max: 6,
    range: "0–6 (0=dim)",
    placeholder: "*",
  },
];

/**
 * Validate a single cron field expression. Accepts:
 *   *               (any)
 *   N               (single number, must be in [min, max])
 *   A-B             (range, both in [min, max], A ≤ B)
 *   *\/N            (every N, N ≥ 1)
 *   A-B\/N          (range with step)
 *   A,B,C           (list — each part validated recursively)
 */
function validateCronField(
  value: string,
  min: number,
  max: number,
): { ok: true } | { ok: false; message: string } {
  const v = value.trim();
  if (v === "") return { ok: false, message: "Vide" };
  if (v === "*") return { ok: true };

  // List: A,B,C — recurse on each part
  if (v.includes(",")) {
    for (const part of v.split(",")) {
      const r = validateCronField(part, min, max);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  // Step: */N or A-B/N
  if (v.includes("/")) {
    const [base, stepStr] = v.split("/");
    const step = Number(stepStr);
    if (!Number.isInteger(step) || step < 1) {
      return { ok: false, message: "Pas /N invalide" };
    }
    return validateCronField(base, min, max);
  }

  // Range: A-B
  if (v.includes("-")) {
    const [aStr, bStr] = v.split("-");
    const a = Number(aStr);
    const b = Number(bStr);
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      return { ok: false, message: "Range invalide" };
    }
    if (a < min || a > max || b < min || b > max) {
      return { ok: false, message: `Hors plage ${min}–${max}` };
    }
    if (a > b) return { ok: false, message: "Min > max" };
    return { ok: true };
  }

  // Single integer
  const n = Number(v);
  if (!Number.isInteger(n)) return { ok: false, message: "Pas un nombre" };
  if (n < min || n > max) {
    return { ok: false, message: `Hors plage ${min}–${max}` };
  }
  return { ok: true };
}

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
  const [parts, setParts] = React.useState<CronParts>(() =>
    splitCron(initialCron),
  );
  const cron = joinCron(parts);
  const setPart = (i: number, value: string) =>
    setParts((prev) => {
      const next = [...prev] as CronParts;
      next[i] = value;
      return next;
    });
  const [timezone, setTimezone] = React.useState(initialTimezone || "UTC");

  const hasCronErrors = parts.some(
    (p, i) => !validateCronField(p, CRON_FIELDS[i].min, CRON_FIELDS[i].max).ok,
  );

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
      {/* Hidden field — the actual cron string sent to the server. */}
      <input type="hidden" name="custom_cron" value={cron} />

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
        <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-foreground/90">
            Choisis quand l&apos;agent doit générer ses posts. Chaque case
            correspond à un champ cron.
          </p>
          <p className="text-muted-foreground">
            Mets <code className="font-mono">*</code> pour « n&apos;importe
            quelle valeur ». Ex. : <code className="font-mono">30</code> en
            Minute + <code className="font-mono">10</code> en Heure + le reste
            en <code className="font-mono">*</code> = tous les jours à 10h30.
          </p>
        </div>
      </div>

      {/* 5 cron parts */}
      <div className="flex flex-col gap-1.5">
        <Label>Quand publier ?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CRON_FIELDS.map((f, i) => {
            const fieldError = validateCronField(parts[i], f.min, f.max);
            const isInvalid = !fieldError.ok;
            return (
              <div key={f.label} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </span>
                <Input
                  value={parts[i]}
                  onChange={(e) => setPart(i, e.target.value)}
                  placeholder={f.placeholder}
                  className={cn(
                    "h-9 text-center font-mono",
                    isInvalid
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  aria-invalid={isInvalid || undefined}
                  inputMode="text"
                  spellCheck={false}
                  autoComplete="off"
                  required
                />
                <span
                  className={cn(
                    "text-[10px]",
                    isInvalid
                      ? "text-destructive"
                      : "text-muted-foreground/80",
                  )}
                >
                  {isInvalid ? fieldError.message : f.range}
                </span>
              </div>
            );
          })}
        </div>
        {state?.fieldErrors?.custom_cron ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.custom_cron}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Cron généré :{" "}
            <code className="font-mono text-foreground/80">{cron}</code>
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground self-center">
            Presets :
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.cron}
              type="button"
              onClick={() => setParts(splitCron(p.cron))}
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
          <SubmitButton mode={mode} disabled={hasCronErrors} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({
  mode,
  disabled,
}: {
  mode: "add" | "edit";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || disabled}>
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
