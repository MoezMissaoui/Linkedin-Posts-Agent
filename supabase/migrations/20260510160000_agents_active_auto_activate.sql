-- Postilys — auto-activate agents when prerequisites become satisfied.
--
-- Complements 20260510143000_agents_active_invariant.sql which only handled
-- the negative transitions (deactivation). This adds the positive ones:
--   • LinkedIn token goes from NULL -> set, AND ≥1 schedule config exists  → active = true
--   • A schedule config is inserted, AND the agent has LinkedIn connected   → active = true
--
-- These triggers are AFTER triggers on the source table so they don't conflict
-- with the BEFORE INSERT/UPDATE invariant trigger on agents (which only enforces
-- "active = true requires prerequisites").
--
-- Idempotent.

-- ---------------------------------------------------------------------------
-- 1) AFTER UPDATE OF linkedin_access_token on agents:
--    Token transitioned from NULL to non-NULL → activate if config exists.
-- ---------------------------------------------------------------------------
create or replace function public.agents_activate_on_linkedin_connect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.linkedin_access_token is null
     and new.linkedin_access_token is not null
     and exists (
       select 1 from public.agent_schedule_config where agent_id = new.id
     )
  then
    update public.agents set active = true where id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_agents_activate_on_linkedin on public.agents;
create trigger trg_agents_activate_on_linkedin
  after update of linkedin_access_token on public.agents
  for each row
  execute function public.agents_activate_on_linkedin_connect();

-- ---------------------------------------------------------------------------
-- 2) AFTER INSERT on agent_schedule_config:
--    If the agent has LinkedIn connected, activate it.
-- ---------------------------------------------------------------------------
create or replace function public.agents_activate_on_config_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.agents a
    where a.id = new.agent_id
      and a.linkedin_access_token is not null
  )
  then
    update public.agents set active = true where id = new.agent_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_asc_activate_agent on public.agent_schedule_config;
create trigger trg_asc_activate_agent
  after insert on public.agent_schedule_config
  for each row
  execute function public.agents_activate_on_config_insert();

-- ---------------------------------------------------------------------------
-- 3) Backfill — any existing agent that meets the conditions but has
--    active = false (because of the previous backfill) gets re-activated.
-- ---------------------------------------------------------------------------
update public.agents a
set active = true
where a.active = false
  and a.linkedin_access_token is not null
  and exists (
    select 1 from public.agent_schedule_config where agent_id = a.id
  );
