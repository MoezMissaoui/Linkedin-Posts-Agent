"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Link2 } from "lucide-react";

import { Drawer, DrawerTabs } from "@/components/ui/drawer";
import { LinkedinCard } from "./linkedin-card";
import {
  ScheduleSection,
  type ScheduleConfigRow,
} from "./schedule-form";
import {
  addScheduleConfig,
  deleteScheduleConfig,
  disconnectLinkedin,
  testLinkedinConnection,
  updateScheduleConfig,
  type AgentFormState,
} from "../actions";

export type AgentDrawerData = {
  id: string;
  title: string | null;
  linkedin: {
    connected: boolean;
    member_name: string | null;
    member_picture: string | null;
    connected_at: string | null;
  };
  schedules: ScheduleConfigRow[];
};

type Props = { agents: AgentDrawerData[] };

const VALID_TABS = ["linkedin", "planning"] as const;
type Tab = (typeof VALID_TABS)[number];

function isTab(v: string | null): v is Tab {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

export function AgentDrawer({ agents }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const drawerParam = searchParams.get("drawer");
  const agentId = searchParams.get("agent");

  const tab: Tab = isTab(drawerParam) ? drawerParam : "linkedin";
  const open = isTab(drawerParam) && !!agentId;

  const agent = open ? agents.find((a) => a.id === agentId) ?? null : null;

  const buildHref = (next: URLSearchParams) => {
    const qs = next.toString();
    return `/agents${qs ? `?${qs}` : ""}`;
  };

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawer");
    params.delete("agent");
    params.delete("linkedin");
    router.replace(buildHref(params), { scroll: false });
  };

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("drawer", value);
    if (agentId) params.set("agent", agentId);
    router.replace(buildHref(params), { scroll: false });
  };

  // We render a Drawer in all states so it can animate close even when agent vanishes.
  return (
    <Drawer
      open={open}
      onClose={close}
      title={agent?.title ?? ""}
      description={
        agent
          ? "Configuration rapide — LinkedIn et planning"
          : undefined
      }
    >
      {agent ? (
        <DrawerBody agent={agent} tab={tab} onTabChange={setTab} />
      ) : null}
    </Drawer>
  );
}

function DrawerBody({
  agent,
  tab,
  onTabChange,
}: {
  agent: AgentDrawerData;
  tab: Tab;
  onTabChange: (t: string) => void;
}) {
  // Wrap server actions with the current agent id.
  const addSchedule = (
    state: AgentFormState | undefined,
    formData: FormData,
  ) => addScheduleConfig(agent.id, state, formData);

  const updateSchedule = (
    configId: string,
    state: AgentFormState | undefined,
    formData: FormData,
  ) => updateScheduleConfig(configId, agent.id, state, formData);

  const deleteSchedule = (configId: string) =>
    deleteScheduleConfig(configId, agent.id);

  const disconnect = () => disconnectLinkedin(agent.id);
  const test = () => testLinkedinConnection(agent.id);

  const member = agent.linkedin.connected
    ? {
        name: agent.linkedin.member_name,
        picture: agent.linkedin.member_picture,
        connectedAt: agent.linkedin.connected_at,
      }
    : null;

  return (
    <div className="flex flex-col gap-5">
      <DrawerTabs
        active={tab}
        onChange={onTabChange}
        tabs={[
          {
            value: "linkedin",
            label: "LinkedIn",
            icon: <Link2 className="size-3.5" />,
          },
          {
            value: "planning",
            label: "Planning",
            icon: <CalendarClock className="size-3.5" />,
          },
        ]}
      />

      {tab === "linkedin" ? (
        <LinkedinCard
          agentId={agent.id}
          member={member}
          returnTo="list"
          onDisconnect={disconnect}
          onTest={test}
        />
      ) : (
        <ScheduleSection
          agentId={agent.id}
          configs={agent.schedules}
          addAction={addSchedule}
          updateAction={updateSchedule}
          deleteAction={deleteSchedule}
        />
      )}
    </div>
  );
}
