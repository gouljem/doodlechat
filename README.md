# Doodle Chat

A private, self-destructing classroom chat app. React frontend, Supabase (Postgres) backend — no separate server process.

## Stack

- **Frontend:** React 18, React Router 6, Vite 5 — plain CSS (no framework), custom SVG avatars.
- **Backend:** Supabase — Postgres for storage, Row Level Security for access control, Realtime for live message/presence updates (no polling for those, no websocket server to run yourself).
- **Persistence:** everything (users, sessions, messages, presence, changelog) lives in your Supabase Postgres database. Your device only remembers *which* username is yours, via `localStorage` — the profile itself is fetched fresh from Supabase every load.

## Requirements

- Node.js 18+
- npm

## Routes

- `/home` — create/join menu
- `/create` — new session form
- `/join` — code entry + live session browser
- `/session/:code` — the chat room itself
- `/admin` — only reachable by the account named "phil" (case-insensitive)
- `/about` — placeholder
- `/changelog` — version history

These are real client-side routes via React Router. In production, configure your static host to fall back to `index.html` for unknown paths (a "SPA rewrite" — most static hosts have a one-line config for this).

## How sessions expire

Every session gets `expiresAt = createdAt + 2.5 hours`. `purge_expired_sessions()` deletes expired session rows (messages and presence cascade-delete automatically via foreign keys). It runs whenever the session list or a specific session is fetched, and optionally on a schedule via `pg_cron` — see Setup step 4.

## Known limitations (worth knowing before you rely on this for anything real)

- **No authentication.** Anyone who knows a username can act as that user — there are no passwords, and there's no Supabase Auth in this app. The Row Level Security policies in `schema.sql` are wide open (anyone with the anon key can read/write everything) to match that same trust model. This is fine for a low-stakes classroom chat tool among friends, not for anything where impersonation would matter.
- **The "admin" check is cosmetic.** `/admin` access and admin-only actions are gated by a client-side string compare against the username `"phil"` — not enforced by RLS. Anyone calling Supabase directly (bypassing the UI) can perform admin actions. This mirrors the old Express API's behavior exactly, not a regression from the migration.
- **Single shared Postgres database, open policies.** Fine for a classroom's worth of casual traffic; not hardened for anything adversarial.

## Project structure

```
doodle-chat/
├── supabase/
│   ├── schema.sql        tables, RLS policies, Realtime setup, RPC functions
│   └── seed.sql          optional sample data
├── src/                  React frontend
│   ├── components/
│   ├── context/
│   ├── lib/
│   │   ├── supabaseClient.js   Supabase client (anon key)
│   │   └── api.js              all Supabase queries, same shape as the old REST client
│   └── pages/
├── index.html
├── vite.config.js
└── package.json
```
