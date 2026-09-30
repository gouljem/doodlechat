import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import ConfirmModal from '../components/ConfirmModal.jsx';

function fmtTimeLeft(ms) {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}

export default function Admin() {
  const { profile, isAdmin, showToast } = useApp();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal state: null | { type, payload }
  const [modal, setModal] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      showToast('Admins only.');
      navigate('/home');
    }
  }, [isAdmin, navigate, showToast]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [list, accountList] = await Promise.all([
        api.listSessions(),
        api.listUsers(),
      ]);
      setSessions(Array.isArray(list) ? list : (list?.sessions ?? []));
      setUsers(Array.isArray(accountList) ? accountList : []);
    } catch (e) {
      console.error('Admin refresh failed:', e);
      setError(e.message || 'Failed to load admin data');
      if (loading) showToast(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [showToast, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [isAdmin, refresh]);

  async function createSession() {
    if (newName.trim().length < 2) {
      showToast('Give it a name first.');
      return;
    }
    try {
      await api.createSession(newName.trim(), profile.username);
      setNewName('');
      showToast('Session created.');
      refresh();
    } catch (e) {
      showToast(e.message);
    }
  }

  function openDeleteSession(code, name) {
    setModal({ type: 'delete-session', code, name });
  }

  function openRenameSession(code, name) {
    setRenameValue(name);
    setModal({ type: 'rename-session', code, name });
  }

  function openDeleteUser(username) {
    if (username === profile?.username) {
      showToast("You can't delete your own account from here.");
      return;
    }
    setModal({ type: 'delete-user', username });
  }

  async function handleModalConfirm() {
    if (!modal) return;
    try {
      if (modal.type === 'delete-session') {
        await api.deleteSession(modal.code, profile.username);
        showToast('Session deleted.');
      } else if (modal.type === 'rename-session') {
        const name = renameValue.trim();
        if (!name) {
          showToast('Name can’t be empty.');
          return;
        }
        await api.renameSession(modal.code, name, profile.username);
        showToast('Session renamed.');
      } else if (modal.type === 'delete-user') {
        await api.deleteUser(modal.username);
        showToast('Account deleted.');
      }
      setModal(null);
      refresh();
    } catch (e) {
      showToast(e.message);
    }
  }

  if (!isAdmin) return null;

  const activeSessions = sessions.length;
  const onlineNow = sessions.reduce((n, s) => n + (s.memberCount || 0), 0);
  const totalAccounts = users.length;

  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    return u.username?.toLowerCase().includes(userSearch.trim().toLowerCase());
  });

  return (
    <div className="page wide">
      <div className="eyebrow">Admin</div>
      <h2 className="page-title">Control panel</h2>
      <p className="page-sub">Create, edit, delete sessions and manage accounts.</p>

      <div className="stats-row">
        <div className="stat-box">
          <div className="num">{loading ? '–' : activeSessions}</div>
          <div className="lbl">Active sessions</div>
        </div>
        <div className="stat-box">
          <div className="num">{loading ? '–' : onlineNow}</div>
          <div className="lbl">Online now</div>
        </div>
        <div className="stat-box">
          <div className="num">{loading ? '–' : totalAccounts}</div>
          <div className="lbl">Total accounts</div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(249,112,102,0.4)', marginBottom: 16 }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 14 }}>
            {error}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">New session</div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <input
            type="text"
            maxLength={30}
            placeholder="Session name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createSession()}
          />
          <button
            className="btn btn-x btn-sm"
            style={{ width: 'auto' }}
            onClick={createSession}
          >
            Create
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">All sessions</div>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or code…"
          style={{ marginTop: 12 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && sessions.length === 0 && (
          <div className="empty-note">Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="empty-note">No matching sessions.</div>
        )}

        {filtered.map((s) => (
          <div className="session-row" key={s.code}>
            <div className="session-info">
              <div className="sname">{s.name}</div>
              <div className="smeta">
                <span className="code-badge">{s.code}</span>
                <span>by {s.createdBy}</span>
                <span>{fmtTimeLeft((s.expiresAt ?? 0) - Date.now())}</span>
                <span>{s.memberCount ?? 0} online</span>
              </div>
            </div>
            <div className="admin-row-actions">
              <button
                className="btn btn-x btn-sm"
                onClick={() => navigate(`/session/${s.code}`)}
              >
                Join
              </button>
              <button
                className="btn btn-x btn-sm"
                onClick={() => openRenameSession(s.code, s.name)}
              >
                Rename
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => openDeleteSession(s.code, s.name)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">All accounts</div>
        <input
          type="text"
          className="search-input"
          placeholder="Search by username…"
          style={{ marginTop: 12 }}
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />

        {loading && users.length === 0 && (
          <div className="empty-note">Loading…</div>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="empty-note">No matching accounts.</div>
        )}

        {filteredUsers.map((u) => (
          <div className="session-row" key={u.username}>
            <div className="session-info">
              <div className="sname">
                {u.username}
                {u.username === profile?.username && (
                  <span className="code-badge" style={{ marginLeft: 8 }}>you</span>
                )}
              </div>
              <div className="smeta">
                {u.avatarId != null && <span>avatar {u.avatarId}</span>}
                {u.createdAt != null && (
                  <span>{new Date(u.createdAt).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="admin-row-actions">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => openDeleteUser(u.username)}
                disabled={u.username === profile?.username}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete session */}
      <ConfirmModal
        open={modal?.type === 'delete-session'}
        title="Delete session?"
        message={`“${modal?.name}” and all of its messages will be removed. This can’t be undone.`}
        confirmLabel="Delete session"
        danger
        onConfirm={handleModalConfirm}
        onClose={() => setModal(null)}
      />

      {/* Rename session */}
      <ConfirmModal
        open={modal?.type === 'rename-session'}
        title="Rename session"
        message="Pick a new name for this room."
        confirmLabel="Save name"
        input={{
          value: renameValue,
          onChange: setRenameValue,
          placeholder: 'Session name',
          maxLength: 30,
        }}
        onConfirm={handleModalConfirm}
        onClose={() => setModal(null)}
      />

      {/* Delete user */}
      <ConfirmModal
        open={modal?.type === 'delete-user'}
        title="Delete account?"
        message={`“${modal?.username}” will be removed. Presence is cleared; old messages may still show the name.`}
        confirmLabel="Delete account"
        danger
        onConfirm={handleModalConfirm}
        onClose={() => setModal(null)}
      />
    </div>
  );
}