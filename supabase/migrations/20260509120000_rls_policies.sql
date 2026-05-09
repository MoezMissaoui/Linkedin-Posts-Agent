-- Postilys — RLS policies for agents, agent_schedule_config, linkedin_posts
-- Ownership model:
--   * agents.user_id = auth.uid()              (direct owner)
--   * agent_schedule_config -> agents.user_id  (transitive owner via agent_id)
--   * linkedin_posts        -> agents.user_id  (transitive owner via agent_id)
--
-- Idempotent: drops then recreates each policy. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Ensure RLS is enabled (Supabase already does this by default for new tables)
-- ---------------------------------------------------------------------------
alter table public.agents                enable row level security;
alter table public.agent_schedule_config enable row level security;
alter table public.linkedin_posts        enable row level security;

-- ---------------------------------------------------------------------------
-- Clean slate: drop EVERY existing policy on the 3 target tables.
-- (Defensive: ensures stale/legacy policies don't leak access.)
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('agents', 'agent_schedule_config', 'linkedin_posts')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- agents — full CRUD on rows you own
-- ---------------------------------------------------------------------------
drop policy if exists "agents_select_own" on public.agents;
create policy "agents_select_own" on public.agents
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "agents_insert_own" on public.agents;
create policy "agents_insert_own" on public.agents
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "agents_update_own" on public.agents;
create policy "agents_update_own" on public.agents
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "agents_delete_own" on public.agents;
create policy "agents_delete_own" on public.agents
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- agent_schedule_config — CRUD on configs of agents you own
-- ---------------------------------------------------------------------------
drop policy if exists "asc_select_own" on public.agent_schedule_config;
create policy "asc_select_own" on public.agent_schedule_config
  for select to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_schedule_config.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "asc_insert_own" on public.agent_schedule_config;
create policy "asc_insert_own" on public.agent_schedule_config
  for insert to authenticated
  with check (
    exists (
      select 1 from public.agents a
      where a.id = agent_schedule_config.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "asc_update_own" on public.agent_schedule_config;
create policy "asc_update_own" on public.agent_schedule_config
  for update to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_schedule_config.agent_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agents a
      where a.id = agent_schedule_config.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "asc_delete_own" on public.agent_schedule_config;
create policy "asc_delete_own" on public.agent_schedule_config
  for delete to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_schedule_config.agent_id
        and a.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- linkedin_posts — CRUD on posts of agents you own
-- ---------------------------------------------------------------------------
drop policy if exists "lp_select_own" on public.linkedin_posts;
create policy "lp_select_own" on public.linkedin_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = linkedin_posts.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "lp_insert_own" on public.linkedin_posts;
create policy "lp_insert_own" on public.linkedin_posts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.agents a
      where a.id = linkedin_posts.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "lp_update_own" on public.linkedin_posts;
create policy "lp_update_own" on public.linkedin_posts
  for update to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = linkedin_posts.agent_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agents a
      where a.id = linkedin_posts.agent_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "lp_delete_own" on public.linkedin_posts;
create policy "lp_delete_own" on public.linkedin_posts
  for delete to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = linkedin_posts.agent_id
        and a.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Helpful indexes for the typical access patterns the app uses
-- ---------------------------------------------------------------------------
create index if not exists agents_user_id_idx
  on public.agents (user_id);

create index if not exists asc_agent_id_idx
  on public.agent_schedule_config (agent_id);

create index if not exists lp_agent_id_created_at_idx
  on public.linkedin_posts (agent_id, created_at desc);

create index if not exists lp_created_at_idx
  on public.linkedin_posts (created_at desc);
