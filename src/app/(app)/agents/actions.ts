"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { assembleSystemPrompt } from "@/lib/prompt-template";
import type { AgentUpdate, ChannelType } from "@/lib/supabase/types";

type PromptMode = "assistant" | "advanced";

export type AgentFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const CHANNELS: ChannelType[] = ["telegram", "email"];

const TITLE_MAX = 120;
const PROMPT_MAX = 8000;
const TOKEN_MAX = 1000;
const SHORT_MAX = 200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedFields = {
  title: string;
  // Prompt system: either typed by hand (advanced) or assembled from the
  // structured fields below (assistant).
  prompt_mode: PromptMode;
  prompt_system_raw: string | null; // user-typed text, used in advanced mode
  prompt_role: string | null;
  prompt_topic: string | null;
  prompt_audience: string | null;
  prompt_hook_emoji: string | null;
  prompt_hook_prefix: string | null;
  prompt_footer: string | null;
  prompt_has_code: boolean;
  prompt_code_language: string | null;
  email: string | null;
  telegram_chat_id: string | null;
  telegram_start_command: string | null;
  approval_channel: ChannelType | null;
  confirmation_channel: ChannelType | null;
  enable_post_picture: boolean;
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

function pickPromptMode(formData: FormData): PromptMode {
  const v = String(formData.get("prompt_mode") ?? "").trim();
  return v === "advanced" ? "advanced" : "assistant";
}

function parse(formData: FormData): ParsedFields {
  return {
    title: String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX),
    prompt_mode: pickPromptMode(formData),
    prompt_system_raw: pickString(formData, "prompt_system", PROMPT_MAX),
    prompt_role: pickString(formData, "prompt_role", SHORT_MAX),
    prompt_topic: pickString(formData, "prompt_topic", SHORT_MAX),
    prompt_audience: pickString(formData, "prompt_audience", SHORT_MAX),
    prompt_hook_emoji: pickString(formData, "prompt_hook_emoji", 16),
    prompt_hook_prefix: pickString(formData, "prompt_hook_prefix", SHORT_MAX),
    prompt_footer: pickString(formData, "prompt_footer", PROMPT_MAX),
    prompt_has_code: pickBool(formData, "prompt_has_code"),
    prompt_code_language: pickString(
      formData,
      "prompt_code_language",
      SHORT_MAX,
    ),
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

function buildPromptPayload(fields: ParsedFields) {
  // In assistant mode: assemble the final prompt from structured fields.
  // In advanced mode: use the raw textarea content as-is.
  const promptSystem =
    fields.prompt_mode === "assistant"
      ? assembleSystemPrompt({
          role: fields.prompt_role ?? "",
          topic: fields.prompt_topic ?? "",
          audience: fields.prompt_audience ?? "",
          hookEmoji: fields.prompt_hook_emoji ?? "",
          hookPrefix: fields.prompt_hook_prefix ?? "",
          footer: fields.prompt_footer ?? "",
          hasCode: fields.prompt_has_code,
          codeLanguage: fields.prompt_code_language ?? "",
        })
      : fields.prompt_system_raw;

  return {
    prompt_mode: fields.prompt_mode,
    prompt_role: fields.prompt_role,
    prompt_topic: fields.prompt_topic,
    prompt_audience: fields.prompt_audience,
    prompt_hook_emoji: fields.prompt_hook_emoji,
    prompt_hook_prefix: fields.prompt_hook_prefix,
    prompt_footer: fields.prompt_footer,
    prompt_has_code: fields.prompt_has_code,
    prompt_code_language: fields.prompt_code_language,
    prompt_system: promptSystem,
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
    ...buildPromptPayload(fields),
    email: fields.email,
    telegram_chat_id: fields.telegram_chat_id,
    telegram_start_command: fields.telegram_start_command,
    approval_channel: fields.approval_channel,
    confirmation_channel: fields.confirmation_channel,
    enable_post_picture: fields.enable_post_picture,
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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function validateScheduleInput(formData: FormData): {
  ok: true;
  cron: string;
  timezone: string;
} | AgentFormState {
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
  return { ok: true, cron, timezone };
}

// Recompute agents.schedule and agents.active from the live state.
//   • schedule = (≥1 config exists)
//   • active   = (≥1 config exists AND linkedin_access_token is set)
// The DB triggers enforce the same invariants — we mirror them here so the
// intent is explicit in app code and doesn't depend on trigger order.
async function syncAgentSchedule(
  supabase: SupabaseServerClient,
  agentId: string,
) {
  const [{ count }, { data: agentRow }] = await Promise.all([
    supabase
      .from("agent_schedule_config")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId),
    supabase
      .from("agents")
      .select("linkedin_access_token")
      .eq("id", agentId)
      .maybeSingle(),
  ]);

  const hasConfig = (count ?? 0) > 0;
  const linkedinConnected = Boolean(agentRow?.linkedin_access_token);

  await supabase
    .from("agents")
    .update({
      schedule: hasConfig,
      active: hasConfig && linkedinConnected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);
}

export async function addScheduleConfig(
  agentId: string,
  _prev: AgentFormState | undefined,
  formData: FormData,
): Promise<AgentFormState> {
  if (!agentId) return { ok: false, message: "ID d'agent manquant." };

  const v = validateScheduleInput(formData);
  if ("cron" in v === false) return v as AgentFormState;
  const { cron, timezone } = v as { cron: string; timezone: string };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { error } = await supabase
    .from("agent_schedule_config")
    .insert({ agent_id: agentId, custom_cron: cron, timezone });
  if (error) return { ok: false, message: error.message };

  await syncAgentSchedule(supabase, agentId);

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
  revalidatePath("/dashboard");
  return { ok: true, message: "Planning ajouté." };
}

export async function updateScheduleConfig(
  configId: string,
  agentId: string,
  _prev: AgentFormState | undefined,
  formData: FormData,
): Promise<AgentFormState> {
  if (!configId) return { ok: false, message: "ID de planning manquant." };

  const v = validateScheduleInput(formData);
  if ("cron" in v === false) return v as AgentFormState;
  const { cron, timezone } = v as { cron: string; timezone: string };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { error } = await supabase
    .from("agent_schedule_config")
    .update({ custom_cron: cron, timezone })
    .eq("id", configId);
  if (error) return { ok: false, message: error.message };

  await syncAgentSchedule(supabase, agentId);

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
  return { ok: true, message: "Planning mis à jour." };
}

export async function deleteScheduleConfig(
  configId: string,
  agentId: string,
): Promise<void> {
  if (!configId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("agent_schedule_config")
    .delete()
    .eq("id", configId);
  if (error) throw new Error(error.message);

  await syncAgentSchedule(supabase, agentId);

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
  revalidatePath("/dashboard");
}

export type ToggleResult = {
  ok: boolean;
  message?: string;
};

export async function toggleAgentActive(
  agentId: string,
  active: boolean,
): Promise<ToggleResult> {
  if (!agentId) return { ok: false, message: "ID d'agent manquant." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  // Pre-validate when activating so the user gets a precise reason.
  // The DB trigger enforces the same invariant — this is just for nicer UX.
  if (active) {
    const [{ data: agent }, { count }] = await Promise.all([
      supabase
        .from("agents")
        .select("linkedin_access_token")
        .eq("id", agentId)
        .maybeSingle(),
      supabase
        .from("agent_schedule_config")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agentId),
    ]);

    if (!agent) {
      return { ok: false, message: "Agent introuvable." };
    }
    if (!agent.linkedin_access_token) {
      return {
        ok: false,
        message: "Connecte LinkedIn d'abord pour activer cet agent.",
      };
    }
    if ((count ?? 0) === 0) {
      return {
        ok: false,
        message: "Ajoute au moins un planning pour activer cet agent.",
      };
    }
  }

  const { error } = await supabase
    .from("agents")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", agentId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/agents");
  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: active ? "Agent activé." : "Agent désactivé.",
  };
}

export async function disconnectLinkedin(agentId: string): Promise<void> {
  if (!agentId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Disconnecting LinkedIn breaks one of the two activation prerequisites,
  // so the agent must become inactive. DB trigger enforces this anyway —
  // setting it explicitly here makes the intent clear in code.
  const { error } = await supabase
    .from("agents")
    .update({
      linkedin_access_token: null,
      linkedin_member_id: null,
      linkedin_member_name: null,
      linkedin_member_picture: null,
      linkedin_connected_at: null,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
}

export type LinkedinTestResult = {
  ok: boolean;
  message: string;
  refreshed?: {
    name: string | null;
    picture: string | null;
  };
};

export async function testLinkedinConnection(
  agentId: string,
): Promise<LinkedinTestResult> {
  if (!agentId) return { ok: false, message: "ID d'agent manquant." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { data: agent } = await supabase
    .from("agents")
    .select("linkedin_access_token")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent?.linkedin_access_token) {
    return { ok: false, message: "Aucun token LinkedIn enregistré." };
  }

  // Lazy import to keep node-only deps out of generic action surface.
  const { getUserInfo } = await import("@/lib/linkedin");
  try {
    const info = await getUserInfo(agent.linkedin_access_token);
    // Refresh stored name/picture in case the user updated their LinkedIn.
    await supabase
      .from("agents")
      .update({
        linkedin_member_name: info.name ?? null,
        linkedin_member_picture: info.picture ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    revalidatePath(`/agents/${agentId}`);
    revalidatePath("/agents");
    return {
      ok: true,
      message: `Connexion valide — ${info.name ?? "compte LinkedIn"}.`,
      refreshed: { name: info.name ?? null, picture: info.picture ?? null },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inattendue.";
    const isAuth = /401|invalid|expired|revoke/i.test(msg);
    return {
      ok: false,
      message: isAuth
        ? "Token rejeté par LinkedIn (expiré ou révoqué). Reconnecte le compte."
        : `Test échoué : ${msg}`,
    };
  }
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
