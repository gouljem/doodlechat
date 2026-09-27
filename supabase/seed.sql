-- Optional: your existing SQLite dev data (5 users, nothing else meaningful —
-- sessions/messages/changelog were empty, and presence rows were stale
-- heartbeats that would just be dead weight in a fresh table).
-- Run this AFTER schema.sql, only if you want to carry it over.

insert into users (username, avatar_id, created_at) values
  ('phil', 'blue-star',    1788136326417),
  ('test', 'blue-cool',    1788237638794),
  ('dasd', 'yellow-wink',  1790516826823),
  ('brev', 'yellow-star',  1790516842118),
  ('dsa',  'blue-classic', 1790517250566)
on conflict (username) do nothing;
