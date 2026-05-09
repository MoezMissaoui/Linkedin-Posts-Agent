import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AgentForm } from "../_components/agent-form";
import { deleteAgent, updateAgent, type AgentFormState } from "../actions";

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

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !agent) notFound();

  // Bind id into the server actions so the form/delete button can call them directly.
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
    </div>
  );
}
