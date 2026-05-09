"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AgentUpdate, ChannelType } from "@/lib/supabase/types";

export type AgentFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const CHANNELS: ChannelType[] = ["telegram", "email"];

const TITLE_MAX = 120;
const SUBJECT_MAX = 200;
const PROMPT_MAX = 8000;
const TOKEN_MAX = 1000;
const SHORT_MAX = 200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedFields = {
  title: string;
  post_subject: string | null;
  prompt_system: string | null;
  email: string | null;
  telegram_chat_id: string | null;
  telegram_start_command: string | null;
  approval_channel: ChannelType | null;
  confirmation_channel: ChannelType | null;
  enable_post_picture: boolean;
  schedule: boolean;
  // Secrets (handled separately)
  linkedin_access_token: string;
  linkedin_clear: boolean;
  telegram_bot_token: string;
  telegram_clear: boolean;
};

function pickString(formData: FormData, name: string, max: number) {
  const raw = String(formData.get(name) ?? "").trim();
  return raw.length === 0 ? null : raw.length > max ? raw.slice(0, max) : raw;
}

function pickChannel(
  formData: FormData,
  name: string,
): ChannelType | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;
  return (CHANNELS as readonly string[]).includes(raw)
    ? (raw as ChannelType)
    : null;
}

function pickBool(formData: FormData, name: string) {
  const v = formData.get(name);
  return v === "on" || v === "true" || v === "1";
}

function parse(formData: FormData): ParsedFields {
  return {
    title: String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX),
    post_subject: pickString(formData, "post_subject", SUBJECT_MAX),
    prompt_system: pickString(formData, "prompt_system", PROMPT_MAX),
    email: pickString(formData, "email", SHORT_MAX),
    telegram_chat_id: pickString(formData, "telegram_chat_id", SHORT_MAX),
    telegram_start_command: pickString(
      formData,
      "telegram_start_command",
      SHORT_MAX,
    ),
    approval_channel: pickChannel(formData, "approval_channel"),
    confirmation_channel: pickChannel(formData, "confirmation_channel"),
    enable_post_picture: pickBool(formData, "enable_post_picture"),
    schedule: pickBool(formData, "schedule"),
    linkedin_access_token: String(
      formData.get("linkedin_access_token") ?? "",
    ).trim().slice(0, TOKEN_MAX),
    linkedin_clear: pickBool(formData, "linkedin_clear"),
    telegram_bot_token: String(
      formData.get("telegram_bot_token") ?? "",
    ).trim().slice(0, TOKEN_MAX),
    telegram_clear: pickBool(formData, "telegram_clear"),
  };
}

function validate(fields: ParsedFields): AgentFormState | null {
  const fieldErrors: Record<string, string> = {};
  if (!fields.title) fieldErrors.title = "Le titre est requis.";
  if (fields.email && !EMAIL_RE.test(fields.email)) {
    fieldErrors.email = "E-mail invalide.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Corrige les champs en erreur.",
      fieldErrors,
    };
  }
  return null;
}

function basePayload(fields: ParsedFields) {
  return {
    title: fields.title,
    post_subject: fields.post_subject,
    prompt_system: fields.prompt_system,
    email: fields.email,
    telegram_chat_id: fields.telegram_chat_id,
    telegram_start_command: fields.telegram_start_command,
    approval_channel: fields.approval_channel,
    confirmation_channel: fields.confirmation_channel,
    enable_post_picture: fields.enable_post_picture,
    schedule: fields.schedule,
  };
}

export async function createAgent(
  _prev: AgentFormState | undefined,
  formData: FormData,
): Promise<AgentFormState> {
  const fields = parse(formData);
  const v = validate(fields);
  if (v) return v;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Session expirée. Reconnecte-toi." };
  }

  const insert = {
    ...basePayload(fields),
    user_id: user.id,
    linkedin_access_token: fields.linkedin_access_token || null,
    telegram_bot_token: fields.telegram_bot_token || null,
  };

  const { data, error } = await supabase
    .from("agents")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Échec de la création.",
    };
  }

  revalidatePath("/agents");
  revalidatePath("/dashboard");
  redirect(`/agents/${data.id}`);
}

export async function updateAgent(
  id: string,
  _prev: AgentFormState | undefined,
  formData: FormData,
): Promise<AgentFormState> {
  if (!id) return { ok: false, message: "ID d'agent manquant." };

  const fields = parse(formData);
  const v = validate(fields);
  if (v) return v;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Session expirée. Reconnecte-toi." };
  }

  // Build update: only include secret fields when explicitly provided.
  const update: AgentUpdate = {
    ...basePayload(fields),
    updated_at: new Date().toISOString(),
  };

  if (fields.linkedin_clear) {
    update.linkedin_access_token = null;
  } else if (fields.linkedin_access_token) {
    update.linkedin_access_token = fields.linkedin_access_token;
  }

  if (fields.telegram_clear) {
    update.telegram_bot_token = null;
  } else if (fields.telegram_bot_token) {
    update.telegram_bot_token = fields.telegram_bot_token;
  }

  const { error } = await supabase
    .from("agents")
    .update(update)
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Agent mis à jour." };
}

// ---------------------------------------------------------------------------
// Schedule configuration (agent_schedule_config)
// ---------------------------------------------------------------------------

const CRON_RE = /^[\d*\/,\-]+(\s+[\d*\/,\-]+){4}$/;

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function upsertSchedule(
  agentId: string,
  _prev: AgentFormState | undefined,
  formData: FormData,
): Promise<AgentFormState> {
  if (!agentId) return { ok: false, message: "ID d'agent manquant." };

  const cron = String(formData.get("custom_cron") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!cron) {
    return {
      ok: false,
      message: "Expression cron requise.",
      fieldErrors: { custom_cron: "Champ requis." },
    };
  }
  if (!CRON_RE.test(cron)) {
    return {
      ok: false,
      message: "Format cron invalide (5 champs attendus).",
      fieldErrors: {
        custom_cron: "Format attendu : minute heure jour mois jour-semaine",
      },
    };
  }
  if (!timezone || !isValidTimezone(timezone)) {
    return {
      ok: false,
      message: "Timezone invalide.",
      fieldErrors: { timezone: "Timezone IANA invalide." },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Session expirée. Reconnecte-toi." };
  }

  // Find existing config for this agent (RLS scopes by ownership).
  const { data: existing } = await supabase
    .from("agent_schedule_config")
    .select("id")
    .eq("agent_id", agentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("agent_schedule_config")
      .update({ custom_cron: cron, timezone })
      .eq("id", existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from("agent_schedule_config")
      .insert({ agent_id: agentId, custom_cron: cron, timezone });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/agents/${agentId}`);
  return { ok: true, message: "Planning enregistré." };
}

export async function deleteAgent(id: string): Promise<void> {
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) {
    // Caller is a form action; we can't return state, so just throw to surface in server logs.
    throw new Error(error.message);
  }

  revalidatePath("/agents");
  revalidatePath("/dashboard");
  redirect("/agents");
}
