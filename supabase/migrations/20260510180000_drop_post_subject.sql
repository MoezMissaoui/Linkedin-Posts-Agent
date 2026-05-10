-- Postilys — drop legacy `post_subject` column from agents.
--
-- Rationale: this field has been removed from the application (the role/topic
-- pair in the structured prompt fields has fully replaced it). Existing rows
-- have a NOT NULL constraint that now blocks INSERTs from the new form, since
-- we never write to it anymore.
--
-- Idempotent.

alter table public.agents
  drop column if exists post_subject;
