import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { AVATAR_IDS } from '../lib/avatars.js';
import Avatar from './Avatar.jsx';

export default function ProfileModal({ onClose }) {
  const { profile, updateProfile, logout, showToast } = useApp();
  const [name, setName] = useState(profile.username);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr('');
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 18 || !/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
      setErr('2-18 characters: letters, numbers, spaces, underscores.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(trimmed, avatarId);
      showToast('Profile updated!');
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal-box">
        <button className="close-x" onClick={onClose}>✕</button>
        <h3 style={{ marginBottom: 18 }}>Profile settings</h3>
        <div className="field">
          <label>Nickname</label>
          <input type="text" maxLength={18} value={name} onChange={(e) => setName(e.target.value)} />
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
        <button className="btn btn-x" style={{ marginTop: 4 }} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => { logout(); onClose(); }}>
          Log out of this device
        </button>
      </div>
    </div>
  );
}
