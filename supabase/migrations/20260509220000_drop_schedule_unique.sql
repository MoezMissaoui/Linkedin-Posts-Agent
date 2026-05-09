-- Postilys — drop the UNIQUE constraint on agent_schedule_config.agent_id.
-- Business rule: an agent can have 0..N schedule configs (multiple crons in
-- different timezones). The unique constraint was preventing the second insert.
--
-- Idempotent: only drops if it exists.

alter table public.agent_schedule_config
  drop constraint if exists agent_schedule_config_agent_id_key;
