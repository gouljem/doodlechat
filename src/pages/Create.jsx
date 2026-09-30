import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';

export default function Create() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setErr('');
    if (name.trim().length < 2) { setErr('Give your session a name (2+ characters).'); return; }
    setBusy(true);
    try {
      const session = await api.createSession(name.trim(), profile.username);
      navigate(`/session/${session.code}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">New session</div>
      <h2 className="page-title">Name your session</h2>
      <p className="page-sub">Something your friends will recognize, like "3rd period" or "Lunch crew".</p>
      <div className="card">
        <div className="field">
          <input
            type="text"
            maxLength={30}
            placeholder="Session name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          {err && <div className="error-text">{err}</div>}
        </div>
        <button className="btn btn-x" disabled={busy} onClick={create}>
          {busy ? 'Creating…' : 'Create & enter →'}
        </button>
      </div>
    </div>
  );
}
