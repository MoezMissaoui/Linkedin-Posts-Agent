import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AgentForm } from "../_components/agent-form";
import { createAgent } from "../actions";

export default function NewAgentPage() {
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
          Nouvel agent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure le prompt, les canaux et les credentials.
        </p>
      </header>

      <AgentForm mode="create" action={createAgent} />
    </div>
  );
}
