import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function fmtTimeLeft(ms) {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}

export default function Join() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [sessions, setSessions] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    async function refresh() {
      try { setSessions(await api.listSessions()); } catch (e) { /* ignore transient errors */ }
    }
    refresh();
    pollRef.current = setInterval(refresh, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function joinByCode() {
    setErr('');
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setErr('Enter a code.'); return; }
    try {
      await api.getSession(trimmed);
      navigate(`/session/${trimmed}`);
    } catch (e) {
      setErr('No active session with that code.');
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">Join</div>
      <h2 className="page-title">Enter a code</h2>
      <div className="card">
        <div className="field">
          <input
            type="text"
            maxLength={5}
            placeholder="e.g. SCX9Q"
            style={{ textTransform: 'uppercase' }}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
          />
          {err && <div className="error-text">{err}</div>}
        </div>
        <button className="btn btn-primary" onClick={joinByCode}>Join session →</button>
      </div>
      <div className="card">
        <div className="card-title">Active sessions</div>
        <div style={{ marginTop: 12 }}>
          {sessions === null && <div className="empty-note">Loading…</div>}
          {sessions && sessions.length === 0 && <div className="empty-note">No sessions yet — create one!</div>}
          {sessions && sessions.map((s) => (
            <div className="session-row" key={s.code}>
              <div className="session-info">
                <div className="sname">{s.name}</div>
                <div className="smeta">
                  <span className="code-badge">{s.code}</span>
                  <span>{fmtTimeLeft(s.expiresAt - Date.now())}</span>
                  <span>{s.memberCount} online</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/session/${s.code}`)}>Join</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
