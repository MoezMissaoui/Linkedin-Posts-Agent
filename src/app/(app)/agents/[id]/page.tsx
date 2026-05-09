import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AgentForm } from "../_components/agent-form";
import {
  ScheduleSection,
  type ScheduleConfigRow,
} from "../_components/schedule-form";
import {
  addScheduleConfig,
  deleteAgent,
  deleteScheduleConfig,
  updateAgent,
  updateScheduleConfig,
  type AgentFormState,
} from "../actions";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: agent, error }, { data: configsData }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("agent_schedule_config")
      .select("id, custom_cron, timezone, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !agent) notFound();

  const configs: ScheduleConfigRow[] = (configsData ?? []).map((c) => ({
    id: c.id,
    custom_cron: c.custom_cron,
    timezone: c.timezone,
  }));

  // Bind id into the agent CRUD server actions.
  const boundUpdate = async (
    state: AgentFormState | undefined,
    formData: FormData,
  ): Promise<AgentFormState> => {
    "use server";
    return updateAgent(id, state, formData);
  };

  const boundDelete = async () => {
    "use server";
    await deleteAgent(id);
  };

  // Schedule actions: bind agentId so the client only needs to deal with config-level args.
  const boundAddSchedule = async (
    state: AgentFormState | undefined,
    formData: FormData,
  ): Promise<AgentFormState> => {
    "use server";
    return addScheduleConfig(id, state, formData);
  };

  const boundUpdateSchedule = async (
    configId: string,
    state: AgentFormState | undefined,
    formData: FormData,
  ): Promise<AgentFormState> => {
    "use server";
    return updateScheduleConfig(configId, id, state, formData);
  };

  const boundDeleteSchedule = async (configId: string) => {
    "use server";
    await deleteScheduleConfig(configId, id);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Agents
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {agent.title || "Agent sans titre"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Édite la configuration. Les tokens vides en édition ne sont pas
          écrasés.
        </p>
      </header>

      <AgentForm
        mode="edit"
        action={boundUpdate}
        initial={agent}
        onDelete={boundDelete}
      />

      <ScheduleSection
        agentId={id}
        configs={configs}
        addAction={boundAddSchedule}
        updateAction={boundUpdateSchedule}
        deleteAction={boundDeleteSchedule}
      />
    </div>
  );
}
