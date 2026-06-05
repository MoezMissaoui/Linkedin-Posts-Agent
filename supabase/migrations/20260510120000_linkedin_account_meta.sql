-- Postilys — extend agents with LinkedIn account display metadata.
-- Stored at OAuth callback time from /v2/userinfo so the UI can show the
-- connected account without an extra round-trip every render.
--
-- Idempotent.

alter table public.agents
  add column if not exists linkedin_member_name    text,
  add column if not exists linkedin_member_picture text,
  add column if not exists linkedin_connected_at   timestamptz;
