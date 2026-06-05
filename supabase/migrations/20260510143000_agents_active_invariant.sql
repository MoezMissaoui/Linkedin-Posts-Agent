-- Postilys — enforce the activation invariant on agents.
--
-- An agent is allowed to have active = TRUE only when BOTH:
--   1. linkedin_access_token IS NOT NULL  (user has connected LinkedIn)
--   2. at least one row in agent_schedule_config references the agent
-- If either condition breaks, active is automatically forced back to FALSE.
--
-- Strategy: 2 triggers + a one-time backfill.
--   • BEFORE INSERT/UPDATE on agents → silently coerce active to false when
--     prerequisites are missing, so naive code/UI can submit active = true
--     and the DB will simply downgrade it instead of erroring.
--   • AFTER DELETE on agent_schedule_config → deactivate the parent agent
--     if no schedule configs remain.
--
-- Idempotent: drops + recreates the functions/triggers each run.

-- ---------------------------------------------------------------------------
-- 1) Coerce active=true on agents when prerequisites are not satisfied.
-- ---------------------------------------------------------------------------
create or replace function public.agents_enforce_active_invariant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active is true then
    if new.linkedin_access_token is null then
      new.active := false;
    elsif not exists (
      select 1 from public.agent_schedule_config where agent_id = new.id
    ) then
      new.active := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agents_enforce_active on public.agents;
create trigger trg_agents_enforce_active
  before insert or update on public.agents
  for each row
  execute function public.agents_enforce_active_invariant();

-- ---------------------------------------------------------------------------
-- 2) When a schedule config is deleted, deactivate the agent if it was the
--    last one. This UPDATE will re-fire trigger #1, which is a no-op since
--    new.active is already false.
-- ---------------------------------------------------------------------------
create or replace function public.agents_deactivate_when_no_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.agent_schedule_config where agent_id = old.agent_id
  ) then
    update public.agents set active = false where id = old.agent_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_asc_deactivate_agent on public.agent_schedule_config;
create trigger trg_asc_deactivate_agent
  after delete on public.agent_schedule_config
  for each row
  execute function public.agents_deactivate_when_no_config();

-- ---------------------------------------------------------------------------
-- 3) One-time backfill — clean any existing rows that violate the invariant.
-- ---------------------------------------------------------------------------
update public.agents a
set active = false
where a.active = true
  and (
    a.linkedin_access_token is null
    or not exists (select 1 from public.agent_schedule_config where agent_id = a.id)
  );
