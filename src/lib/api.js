import { supabase } from './supabaseClient.js';

const VALID_NAME = /^[a-zA-Z0-9_ ]{2,18}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SESSION_MS = 2.5 * 60 * 60 * 1000;
const PRESENCE_STALE_MS = 15000;

function genCode() {
  let c = 'SC';
  for (let i = 0; i < 3; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

function throwIfError(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

// Mirrors the old server's requireAdmin check for UX parity. NOTE: this is
// NOT a security boundary — RLS policies are open (see supabase/schema.sql),
// so it only gates the UI, same trust model the old public REST API had.
function requireAdmin(requestedBy) {
  if (!requestedBy || requestedBy.trim().toLowerCase() !== 'phil') {
    throw new Error('Admins only.');
  }
}

// ---------- row -> client shape mappers ----------
function userToClient(row) {
  return { username: row.username, avatarId: row.avatar_id };
}
function userToAdminClient(row) {
  return { username: row.username, avatarId: row.avatar_id, createdAt: row.created_at ?? null };
}
function messageToClient(row) {
  return { id: row.id, user: row.username, avatarId: row.avatar_id, text: row.text, ts: row.ts };
}
function presenceToClient(row) {
  return {
    username: row.username,
    avatarId: row.avatar_id,
    typing: !!row.typing,
    isAdmin: !!row.is_admin,
    lastSeen: row.last_seen,
  };
}
function sessionToClient(row, memberCount) {
  return {
    code: row.code,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    memberCount,
  };
}

async function purgeExpiredSessions() {
  // Best-effort — ignore failures (e.g. function not deployed yet).
  try {
    await supabase.rpc('purge_expired_sessions');
  } catch (e) { /* noop */ }
}

async function fetchRawSession(code) {
  const { data, error } = await supabase.from('sessions').select('*').eq('code', code).maybeSingle();
  throwIfError(error, 'Failed to load session');
  return data;
}

async function attachMemberCounts(sessionRows) {
  if (sessionRows.length === 0) return [];
  const codes = sessionRows.map((s) => s.code);
  const cutoff = Date.now() - PRESENCE_STALE_MS;
  const { data: presenceRows, error } = await supabase
    .from('presence')
    .select('session_code')
    .in('session_code', codes)
    .gt('last_seen', cutoff);
  throwIfError(error, 'Failed to load presence');
  const counts = {};
  for (const row of presenceRows || []) counts[row.session_code] = (counts[row.session_code] || 0) + 1;
  return sessionRows.map((s) => sessionToClient(s, counts[s.code] || 0));
}

export const api = {
  // ---------------- users ----------------
  getUser: async (username) => {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
    throwIfError(error, 'Failed to load user');
    if (!data) throw new Error('User not found');
    return userToClient(data);
  },

  listUsers: async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    throwIfError(error, 'Failed to list users');
    return (data || []).map(userToAdminClient);
  },

  createUser: async (username, avatarId) => {
    const trimmed = (username || '').trim();
    if (!VALID_NAME.test(trimmed)) {
      throw new Error('2-18 characters: letters, numbers, spaces, underscores.');
    }
    if (!avatarId) throw new Error('Avatar is required.');

    const { data: existing } = await supabase.from('users').select('username').eq('username', trimmed).maybeSingle();
    if (existing) throw new Error('That name is taken. Try another.');

    const { error } = await supabase.from('users').insert({
      username: trimmed,
      avatar_id: avatarId,
      created_at: Date.now(),
    });
    if (error) {
      if (error.code === '23505') throw new Error('That name is taken. Try another.');
      throw new Error(error.message || 'Failed to create user');
    }
    return { username: trimmed, avatarId };
  },

  updateUser: async (oldUsername, newUsername, avatarId) => {
    const { data: current, error: getErr } = await supabase.from('users').select('*').eq('username', oldUsername).maybeSingle();
    throwIfError(getErr, 'Failed to load user');
    if (!current) throw new Error('User not found');

    const finalName = (newUsername || current.username).trim();
    if (!VALID_NAME.test(finalName)) {
      throw new Error('2-18 characters: letters, numbers, spaces, underscores.');
    }
    const finalAvatar = avatarId || current.avatar_id;

    const { error } = await supabase.rpc('rename_user', {
      p_old_username: current.username,
      p_new_username: finalName,
      p_avatar_id: finalAvatar,
    });
    if (error) {
      if (/taken/i.test(error.message)) throw new Error('That name is taken. Try another.');
      throw new Error(error.message || 'Failed to update user');
    }
    return { username: finalName, avatarId: finalAvatar };
  },

  deleteUser: async (username) => {
    const { data: current } = await supabase.from('users').select('username').eq('username', username).maybeSingle();
    if (!current) throw new Error('User not found');
    await supabase.from('presence').delete().eq('username', username);
    const { error } = await supabase.from('users').delete().eq('username', username);
    throwIfError(error, 'Failed to delete user');
  },

  // ---------------- sessions ----------------
  listSessions: async () => {
    await purgeExpiredSessions();
    const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    throwIfError(error, 'Failed to list sessions');
    return attachMemberCounts(data || []);
  },

  getStats: async () => {
    await purgeExpiredSessions();
    const [{ count: activeSessions }, { count: totalAccounts }] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ]);
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    const { data: onlineRows } = await supabase.from('presence').select('username').gt('last_seen', cutoff);
    const onlineNow = new Set((onlineRows || []).map((r) => r.username)).size;
    return { activeSessions: activeSessions || 0, onlineNow, totalAccounts: totalAccounts || 0 };
  },

  getSession: async (code) => {
    await purgeExpiredSessions();
    const upper = code.toUpperCase();
    const row = await fetchRawSession(upper);
    if (!row) throw new Error('Session not found or expired.');
    const [withCount] = await attachMemberCounts([row]);
    return withCount;
  },

  createSession: async (name, createdBy) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Session name is required.');
    if (!createdBy) throw new Error('Missing creator.');
    await purgeExpiredSessions();

    const now = Date.now();
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = genCode();
      const row = { code, name: trimmedName, created_by: createdBy, created_at: now, expires_at: now + SESSION_MS };
      const { error } = await supabase.from('sessions').insert(row);
      if (!error) {
        const [withCount] = await attachMemberCounts([row]);
        return withCount;
      }
      if (error.code !== '23505') throw new Error(error.message || 'Failed to create session');
      // code collision — loop and try a new one
    }
    throw new Error('Failed to generate a unique session code. Try again.');
  },

  purgeExpiredSessions: async () => {
    const before = await supabase.from('sessions').select('code', { count: 'exact', head: true });
    await purgeExpiredSessions();
    const after = await supabase.from('sessions').select('code', { count: 'exact', head: true });
    return { purged: (before.count || 0) - (after.count || 0) };
  },

  renameSession: async (code, name, requestedBy) => {
    requireAdmin(requestedBy);
    const upper = code.toUpperCase();
    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Name is required.');
    const { data, error } = await supabase.from('sessions').update({ name: trimmedName }).eq('code', upper).select().maybeSingle();
    throwIfError(error, 'Failed to rename session');
    if (!data) throw new Error('Session not found.');
    const [withCount] = await attachMemberCounts([data]);
    return withCount;
  },

  deleteSession: async (code, requestedBy) => {
    requireAdmin(requestedBy);
    const upper = code.toUpperCase();
    // messages/presence cascade-delete via FK ON DELETE CASCADE
    const { data, error } = await supabase.from('sessions').delete().eq('code', upper).select().maybeSingle();
    throwIfError(error, 'Failed to delete session');
    if (!data) throw new Error('Session not found.');
  },

  // ---------------- messages ----------------
  listMessages: async (code) => {
    const upper = code.toUpperCase();
    const session = await fetchRawSession(upper);
    if (!session || session.expires_at <= Date.now()) throw new Error('Session not found or expired.');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_code', upper)
      .order('ts', { ascending: true })
      .limit(500);
    throwIfError(error, 'Failed to load messages');
    return (data || []).map(messageToClient);
  },

  sendMessage: async (code, username, avatarId, text) => {
    const upper = code.toUpperCase();
    const session = await fetchRawSession(upper);
    if (!session || session.expires_at <= Date.now()) throw new Error('Session not found or expired.');
    if (!username || !avatarId) throw new Error('Missing identity.');
    const trimmed = (text || '').trim().slice(0, 500);
    if (!trimmed) throw new Error('Message cannot be empty.');

    const { data, error } = await supabase
      .from('messages')
      .insert({ session_code: upper, username, avatar_id: avatarId, text: trimmed, ts: Date.now() })
      .select()
      .single();
    throwIfError(error, 'Failed to send message');
    return messageToClient(data);
  },

  // ---------------- presence ----------------
  listMembers: async (code) => {
    const upper = code.toUpperCase();
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    const { data, error } = await supabase.from('presence').select('*').eq('session_code', upper).gt('last_seen', cutoff);
    throwIfError(error, 'Failed to load members');
    return (data || []).map(presenceToClient);
  },

  heartbeat: async (code, username, avatarId, typing, isAdmin) => {
    const upper = code.toUpperCase();
    if (!username || !avatarId) throw new Error('Missing identity.');
    const { error } = await supabase
      .from('presence')
      .upsert(
        { session_code: upper, username, avatar_id: avatarId, last_seen: Date.now(), typing: !!typing, is_admin: !!isAdmin },
        { onConflict: 'session_code,username' }
      );
    throwIfError(error, 'Failed to send heartbeat');
  },

  leaveSession: async (code, username) => {
    const upper = code.toUpperCase();
    await supabase.from('presence').delete().eq('session_code', upper).eq('username', username);
  },

  // ---------------- realtime subscriptions ----------------
  // Both return an unsubscribe function. New — the old REST API had no
  // realtime, Chat.jsx polled instead; now it can push updates live.
  subscribeMessages: (code, onInsert) => {
    const upper = code.toUpperCase();
    const channel = supabase
      .channel(`messages:${upper}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_code=eq.${upper}` },
        (payload) => onInsert(messageToClient(payload.new))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribePresence: (code, onChange) => {
    const upper = code.toUpperCase();
    const channel = supabase
      .channel(`presence:${upper}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence', filter: `session_code=eq.${upper}` },
        () => onChange()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  // ---------------- changelog ----------------
  listChangelog: async () => {
    const { data, error } = await supabase.from('changelog').select('*').order('created_at', { ascending: false });
    throwIfError(error, 'Failed to load changelog');
    return (data || []).map((r) => ({ id: r.id, version: r.version, body: r.body, createdAt: r.created_at }));
  },

  createChangelog: async (version, body) => {
    if (!version?.trim() || !body?.trim()) throw new Error('Version and body are required.');
    const { data, error } = await supabase
      .from('changelog')
      .insert({ version: version.trim(), body: body.trim(), created_at: Date.now() })
      .select()
      .single();
    throwIfError(error, 'Failed to create entry');
    return { id: data.id, version: data.version, body: data.body, createdAt: data.created_at };
  },

  deleteChangelog: async (id) => {
    const { error, count } = await supabase.from('changelog').delete({ count: 'exact' }).eq('id', Number(id));
    throwIfError(error, 'Failed to delete entry');
    if (!count) throw new Error('Not found');
  },
};
