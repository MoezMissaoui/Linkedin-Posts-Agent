-- Postilys — drop the `confirmation_channel` column from agents.
--
-- The "after-publication confirmation" channel was redundant with the approval
-- channel and is no longer used by the workflow. The application no longer
-- reads or writes this column.
--
-- Idempotent.

alter table public.agents
  drop column if exists confirmation_channel;
