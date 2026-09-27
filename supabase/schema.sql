-- Doodle Chat — Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor (or `supabase db execute`).
-- Mirrors the old SQLite schema. Timestamps stay as epoch-ms BIGINTs so the
-- existing frontend formatting code (Date.now(), fmtClock, etc.) needs no changes.

create extension if not exists citext;   -- case-insensitive username matching
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------- users ----------
create table if not exists users (
  username   citext primary key,        -- citext = case-insensitive equality, matches old lower(username)=lower(?)
  avatar_id  text not null,
  created_at bigint not null
);

-- ---------- sessions ----------
create table if not exists sessions (
  code        text primary key,
  name        text not null,
  created_by  text not null,
  created_at  bigint not null,
  expires_at  bigint not null
);

-- ---------- messages ----------
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  session_code  text not null references sessions(code) on delete cascade,
  username      text not null,
  avatar_id     text not null,
  text          text not null,
  ts            bigint not null
);

-- ---------- presence ----------
create table if not exists presence (
  session_code  text not null references sessions(code) on delete cascade,
  username      citext not null,
  avatar_id     text not null,
  last_seen     bigint not null,
  typing        boolean not null default false,
  is_admin      boolean not null default false,
  primary key (session_code, username)
);

-- ---------- changelog ----------
create table if not exists changelog (
  id          bigint generated always as identity primary key,
  version     text not null,
  body        text not null,
  created_at  bigint not null
);

create index if not exists idx_messages_session  on messages(session_code);
create index if not exists idx_presence_session  on presence(session_code);

-- =========================================================================
-- Row Level Security
-- =========================================================================
-- The app has no real auth (usernames are just self-chosen strings, and the
-- "admin" check is a client-side string compare against 'phil' — this was
-- already true of the old Express API too, which had no auth middleware).
-- These policies keep that SAME trust model: the anon key can read/write
-- everything, matching what the old public REST API allowed. This is fine
-- for a throwaway/ephemeral chat toy, but if you ever want real access
-- control, add Supabase Auth and rewrite these policies to check auth.uid().
-- =========================================================================

alter table users      enable row level security;
alter table sessions   enable row level security;
alter table messages   enable row level security;
alter table presence   enable row level security;
alter table changelog  enable row level security;

create policy "users all"      on users      for all using (true) with check (true);
create policy "sessions all"   on sessions   for all using (true) with check (true);
create policy "messages all"   on messages   for all using (true) with check (true);
create policy "presence all"   on presence   for all using (true) with check (true);
create policy "changelog all"  on changelog  for all using (true) with check (true);

-- =========================================================================
-- Realtime
-- =========================================================================
-- Lets the client subscribe to live INSERT/UPDATE/DELETE events instead of
-- polling. Requires these tables to be in the supabase_realtime publication.
-- =========================================================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table presence;

-- =========================================================================
-- Expiry cleanup
-- =========================================================================
-- Old server had a setInterval that purged expired sessions every 60s.
-- messages/presence cascade-delete automatically via the FKs above, so this
-- function only needs to delete the session row itself.
-- =========================================================================

create or replace function purge_expired_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from sessions where expires_at <= (extract(epoch from now()) * 1000)::bigint;
$$;

-- =========================================================================
-- Rename user (cascades to messages/presence/sessions like the old
-- server-side transaction did). Wrapped in a function so the whole rename
-- is atomic — the client can't call several separate UPDATEs "in a
-- transaction" the way better-sqlite3's db.transaction() did.
-- =========================================================================

create or replace function rename_user(
  p_old_username citext,
  p_new_username citext,
  p_avatar_id text
)
returns table (username citext, avatar_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from users u where u.username = p_old_username) then
    raise exception 'User not found';
  end if;

  if p_new_username <> p_old_username
     and exists (select 1 from users u where u.username = p_new_username) then
    raise exception 'That name is taken. Try another.';
  end if;

  update users set username = p_new_username, avatar_id = p_avatar_id
    where users.username = p_old_username;
  update messages set username = p_new_username::text
    where messages.username = p_old_username::text;
  update presence set username = p_new_username
    where presence.username = p_old_username;
  update sessions set created_by = p_new_username::text
    where sessions.created_by = p_old_username::text;

  return query select u.username, u.avatar_id from users u where u.username = p_new_username;
end;
$$;

grant execute on function rename_user(citext, citext, text) to anon, authenticated;
grant execute on function purge_expired_sessions() to anon, authenticated;

-- Optional: schedule it to run every minute via pg_cron, so expiry doesn't
-- depend on a client happening to load a page. Enable the "pg_cron"
-- extension first (Database -> Extensions in the dashboard), then run:
--
--   select cron.schedule(
--     'purge-expired-sessions',
--     '* * * * *',
--     $$select purge_expired_sessions();$$
--   );
--
-- If you'd rather not enable pg_cron, the app also calls this function
-- opportunistically from the client (see src/lib/api.js), same as before.
