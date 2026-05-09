"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, Clock, Globe, Loader2, Save } from "lucide-react";
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

type Props = {
  enabled: boolean;
  initialCron: string;
  initialTimezone: string;
  action: (
    state: AgentFormState | undefined,
    formData: FormData,
  ) => Promise<AgentFormState>;
};

const initialState: AgentFormState = { ok: false };

export function ScheduleForm({
  enabled,
  initialCron,
  initialTimezone,
  action,
}: Props) {
  const [state, formAction] = useActionState(action, initialState);
  const [cron, setCron] = React.useState(initialCron);
  const [timezone, setTimezone] = React.useState(initialTimezone || "UTC");
  const [allTimezones, setAllTimezones] = React.useState<string[]>(COMMON_TZ);

  React.useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  React.useEffect(() => {
    // Pull the full IANA list when available; fallback to the curated one.
    try {
      const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
      if (typeof fn === "function") {
        const list = fn("timeZone");
        if (list && list.length) setAllTimezones(list);
      }
    } catch {
      // fallback OK
    }
  }, []);

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
              Quand l&apos;agent doit-il générer ses prochains posts ?
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!enabled ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Le toggle <strong>« Planifier automatiquement »</strong> est
            désactivé sur cet agent. Tu peux configurer le planning ici, mais il
            ne sera utilisé qu&apos;une fois le toggle activé dans la section
            Publication.
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom_cron">Expression cron</Label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="custom_cron"
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

            <div className="flex flex-wrap gap-1.5 pt-1">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="timezone"
                name="timezone"
                list="tz-list"
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
              <datalist id="tz-list">
                {allTimezones.map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </div>
            {state?.fieldErrors?.timezone ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.timezone}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Notation IANA. Ex. <code className="font-mono">Africa/Tunis</code>,{" "}
                <code className="font-mono">Europe/Paris</code>,{" "}
                <code className="font-mono">UTC</code>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              {cron ? humanize(cron, timezone) : null}
            </p>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      Enregistrer le planning
    </Button>
  );
}

// Tiny human-readable preview for common patterns.
function humanize(cron: string, tz: string): string | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [m, h, dom, mon, dow] = parts;

  const isStar = (s: string) => s === "*";
  const isNum = (s: string) => /^\d+$/.test(s);

  // Daily at H:M
  if (isNum(m) && isNum(h) && isStar(dom) && isStar(mon) && isStar(dow)) {
    const time = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    return `Tous les jours à ${time} (${tz})`;
  }

  // Weekly on dow at H:M
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
    const time = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    return `${days[Number(dow) % 7]} à ${time} (${tz})`;
  }

  return `Cron : ${cron} · ${tz}`;
}
