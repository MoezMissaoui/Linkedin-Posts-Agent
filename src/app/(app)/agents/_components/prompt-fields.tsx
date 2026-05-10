"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Sparkles, FileText } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { assembleSystemPrompt } from "@/lib/prompt-template";

type Mode = "assistant" | "advanced";

type Initial = {
  prompt_mode: Mode | null;
  prompt_role: string | null;
  prompt_topic: string | null;
  prompt_audience: string | null;
  prompt_hook_emoji: string | null;
  prompt_hook_prefix: string | null;
  prompt_footer: string | null;
  prompt_has_code: boolean;
  prompt_code_language: string | null;
  prompt_system: string | null;
};

const DEFAULT_FOOTER = `➤ I share real-production tips. Let's grow together 🤝
🔔 Follow me to see all my updates!
💻 GitHub: https://github.com/your-handle
#yourhashtags`;

export function PromptFields({ initial }: { initial?: Initial }) {
  const [mode, setMode] = React.useState<Mode>(
    initial?.prompt_mode ?? "assistant",
  );

  const [role, setRole] = React.useState(initial?.prompt_role ?? "");
  const [topic, setTopic] = React.useState(initial?.prompt_topic ?? "");
  const [audience, setAudience] = React.useState(
    initial?.prompt_audience ?? "",
  );
  const [hookEmoji, setHookEmoji] = React.useState(
    initial?.prompt_hook_emoji ?? "💡",
  );
  const [hookPrefix, setHookPrefix] = React.useState(
    initial?.prompt_hook_prefix ?? "",
  );
  const [footer, setFooter] = React.useState(
    initial?.prompt_footer ?? DEFAULT_FOOTER,
  );
  const [hasCode, setHasCode] = React.useState<boolean>(
    initial?.prompt_has_code ?? true,
  );
  const [codeLanguage, setCodeLanguage] = React.useState(
    initial?.prompt_code_language ?? "",
  );

  const [advancedText, setAdvancedText] = React.useState(
    initial?.prompt_system ?? "",
  );

  const [previewOpen, setPreviewOpen] = React.useState(false);

  const assembled = React.useMemo(
    () =>
      assembleSystemPrompt({
        role,
        topic,
        audience,
        hookEmoji,
        hookPrefix,
        footer,
        hasCode,
        codeLanguage,
      }),
    [role, topic, audience, hookEmoji, hookPrefix, footer, hasCode, codeLanguage],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Hidden input ensures the action sees the current mode. */}
      <input type="hidden" name="prompt_mode" value={mode} />

      {/* Mode switcher */}
      <ModeSwitcher mode={mode} onChange={setMode} />

      {mode === "assistant" ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="prompt_topic"
              label="Sujet principal"
              hint="Le thème global ; sera utilisé dans le hook et l'instruction."
              required
            >
              <Input
                id="prompt_topic"
                name="prompt_topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Laravel · Docker · Project Management · Finance"
                maxLength={200}
                required
              />
            </Field>

            <Field
              id="prompt_audience"
              label="Audience cible"
              hint="À qui s'adressent les posts ?"
              required
            >
              <Input
                id="prompt_audience"
                name="prompt_audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="senior developers · DevOps · PMs"
                maxLength={200}
                required
              />
            </Field>
          </div>

          <Field
            id="prompt_role"
            label="Rôle de l'agent"
            hint="Décris l'expertise. Utilisé en tête du prompt."
            required
          >
            <Textarea
              id="prompt_role"
              name="prompt_role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="an expert Full-stack Developer with 20+ years of experience in PHP, Laravel and clean code"
              rows={3}
              className="font-sans"
              maxLength={1000}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
            <Field
              id="prompt_hook_emoji"
              label="Emoji du hook"
              hint="Le 1er caractère du post."
              required
            >
              <Input
                id="prompt_hook_emoji"
                name="prompt_hook_emoji"
                value={hookEmoji}
                onChange={(e) => setHookEmoji(e.target.value)}
                placeholder="💡"
                maxLength={16}
                required
              />
            </Field>

            <Field
              id="prompt_hook_prefix"
              label="Préfixe du hook"
              hint='Ex. "Laravel Tip" → produit "💡 Laravel Tip: …"'
              required
            >
              <Input
                id="prompt_hook_prefix"
                name="prompt_hook_prefix"
                value={hookPrefix}
                onChange={(e) => setHookPrefix(e.target.value)}
                placeholder="Laravel Tip · Docker Tip · PMP Insight"
                maxLength={200}
                required
              />
            </Field>
          </div>

          <Field
            id="prompt_footer"
            label="Footer / signature"
            hint="Toujours ajouté à la fin de chaque post (CTA, GitHub, hashtags…)."
            required
          >
            <Textarea
              id="prompt_footer"
              name="prompt_footer"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={5}
              className="font-sans"
              maxLength={2000}
              required
            />
          </Field>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
            <div className="flex-1">
              <Label htmlFor="prompt_has_code">
                Inclure un snippet de code
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Désactive si le sujet n&apos;a pas de code (finance, soft
                skills…).
              </p>
            </div>
            <Switch
              id="prompt_has_code"
              name="prompt_has_code"
              checked={hasCode}
              onCheckedChange={setHasCode}
            />
          </div>

          {hasCode ? (
            <Field
              id="prompt_code_language"
              label="Langage du code"
              hint="Servira à instruire le LLM (PHP, YAML, Bash, Python, JavaScript…)."
              required
            >
              <Input
                id="prompt_code_language"
                name="prompt_code_language"
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                placeholder="PHP · YAML · Bash · TypeScript"
                maxLength={200}
                required
              />
            </Field>
          ) : null}

          {/* Aperçu du prompt assemblé */}
          <details
            open={previewOpen}
            onToggle={(e) => setPreviewOpen(e.currentTarget.open)}
            className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3"
          >
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-3.5" />
                Aperçu du prompt assemblé
              </span>
              {previewOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </summary>
            <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-background/60 p-3 text-xs leading-relaxed text-foreground/85">
              {assembled}
            </pre>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cette version sera enregistrée dans <code>agents.prompt_system</code> au
              prochain enregistrement.
            </p>
          </details>
        </div>
      ) : (
        <Field
          id="prompt_system"
          label="Prompt système (mode avancé)"
          hint="Édite directement le prompt envoyé au LLM. À tes risques — un format JSON cassé fera planter le workflow n8n."
          required
        >
          <Textarea
            id="prompt_system"
            name="prompt_system"
            value={advancedText}
            onChange={(e) => setAdvancedText(e.target.value)}
            rows={14}
            placeholder="You are an expert..."
            maxLength={8000}
            required
          />
        </Field>
      )}
    </div>
  );
}

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 self-start rounded-md border border-border/60 bg-muted/40 p-1">
      <ModeButton
        active={mode === "assistant"}
        onClick={() => onChange("assistant")}
        icon={<Sparkles className="size-3.5" />}
        label="Assistant"
        sub="Recommandé"
      />
      <ModeButton
        active={mode === "advanced"}
        onClick={() => onChange("advanced")}
        icon={<FileText className="size-3.5" />}
        label="Avancé"
        sub="Édition libre"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        <span className="text-[10px] font-normal opacity-70">{sub}</span>
      </span>
    </button>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
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
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
