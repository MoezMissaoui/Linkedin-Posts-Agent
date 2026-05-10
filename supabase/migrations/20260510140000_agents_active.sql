-- Postilys — add `active` flag to agents.
-- An agent is active by default. When false, the workflow runner should skip it
-- (no generation, no post). The column is NOT NULL so the runner can rely on
-- a deterministic value.
--
-- Idempotent.

alter table public.agents
  add column if not exists active boolean not null default true;
