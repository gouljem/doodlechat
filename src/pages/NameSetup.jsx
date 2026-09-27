import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { AVATAR_IDS, randomAvatarId } from '../lib/avatars.js';
import Avatar from '../components/Avatar.jsx';

export default function NameSetup() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(randomAvatarId());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setErr('');
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 18 || !/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
      setErr('2-18 characters: letters, numbers, spaces, underscores.');
      return;
    }
    setBusy(true);
    try {
      await login(trimmed, avatarId);
      navigate('/home');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">Welcome</div>
      <h2 className="page-title">Pick your identity</h2>
      <p className="page-sub">This is how classmates will recognize you. Names are unique — first come, first served.</p>
      <div className="card">
        <div className="field">
          <label>Nickname</label>
          <input
            type="text"
            maxLength={18}
            placeholder="e.g. Skribbler42"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
          />
          {err && <div className="error-text">{err}</div>}
        </div>
        <div className="field">
          <label>Avatar</label>
          <div className="avatar-grid">
            {AVATAR_IDS.map((id) => (
              <div
                key={id}
                className={'avatar-opt' + (id === avatarId ? ' selected' : '')}
                onClick={() => setAvatarId(id)}
              >
                <Avatar id={id} size="100%" />
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={busy} onClick={start}>
          {busy ? 'Joining…' : 'Enter Doodle Chat →'}
        </button>
      </div>
    </div>
  );
}
