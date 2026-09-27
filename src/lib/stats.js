import { sql } from '../../../../doodle-chat (1)/doodle-chat/lib/db.js';
import { PRESENCE_STALE_MS } from '../../../../doodle-chat (1)/doodle-chat/lib/constants.js';
import { purgeExpiredSessions } from '../../../../doodle-chat (1)/doodle-chat/lib/cleanup.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await purgeExpiredSessions();

  const [[{ n: activeSessions }], [{ n: onlineNow }], [{ n: totalAccounts }]] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM sessions`,
    sql`SELECT COUNT(DISTINCT username)::int AS n FROM presence WHERE last_seen > ${Date.now() - PRESENCE_STALE_MS}`,
    sql`SELECT COUNT(*)::int AS n FROM users`
  ]);

  res.status(200).json({ activeSessions, onlineNow, totalAccounts });
}
