-- Postilys — split the system prompt into structured fields + a compiled view.
--
-- Goal: protect the technical/structural parts of the prompt (JSON output,
-- anti-duplication protocol, code formatting rules) by generating them in app
-- code, while letting the user customize role / topic / audience / hook /
-- footer / code-language via simple form fields.
--
-- The final assembled prompt is written into `prompt_system` on every save by
-- the application layer. n8n keeps reading `prompt_system` exactly as before.
--
-- A `prompt_mode` column ("assistant" | "advanced") lets power users edit the
-- raw prompt text directly without the assembler overwriting it.
--
-- Idempotent.

alter table public.agents
  add column if not exists prompt_role           text,
  add column if not exists prompt_topic          text,
  add column if not exists prompt_audience       text,
  add column if not exists prompt_hook_emoji     text,
  add column if not exists prompt_hook_prefix    text,
  add column if not exists prompt_footer         text,
  add column if not exists prompt_has_code       boolean not null default true,
  add column if not exists prompt_code_language  text,
  add column if not exists prompt_mode           text not null default 'assistant';

-- Constrain prompt_mode values.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agents_prompt_mode_check'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
      add constraint agents_prompt_mode_check
      check (prompt_mode in ('assistant', 'advanced'));
  end if;
end $$;

-- Backfill: any agent that already has a prompt_system but no structured
-- fields was created before the assistant existed → keep them in advanced mode
-- so their hand-crafted prompt is not overwritten on next save.
update public.agents
set prompt_mode = 'advanced'
where prompt_system is not null
  and prompt_system <> ''
  and prompt_role is null
  and prompt_topic is null;
