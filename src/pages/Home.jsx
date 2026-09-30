import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Icon from '../components/Icons.jsx';

function fmtTimeLeft(ms) {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return `${s}s left`;
}

const STEPS = [
  { icon: 'plus', title: 'Create a room', body: 'Name a session and get a 5-character code instantly.' },
  { icon: 'hash', title: 'Share the code', body: 'Have a friend join through the "/join" page or the bottom of this page.' },
  { icon: 'timer', title: 'Chat, then vanish', body: 'Rooms self-destruct after 2.5 hours. Nothing lingers overnight.' },
];

const FEATURES = [
  { icon: 'nose', title: 'Kalvin Nose', body: 'Be aware of rooms you join, there might be a possibility that long-nose Kalvin Byrd is lurking...' },
  { icon: 'shield', title: 'Private by default', body: 'No global feed. Conversations stay inside the session.' },
  { icon: 'timer', title: 'Auto-expire', body: 'Sessions wipe themselves so old chats do not pile up.' },
  { icon: 'users', title: 'Live presence', body: 'See who is in the room and who is typing, in real time.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const list = await api.listSessions();
        if (!cancelled) setSessions(list);
      } catch {
        if (!cancelled) setSessions([]);
      }
    }
    refresh();
    const t = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const online = sessions ? sessions.reduce((n, s) => n + (s.memberCount || 0), 0) : null;

  return (
    <div className="page wide">
      <section className="home-hero">
        <div className="eyebrow">Doodle Chat</div>
        <h2 className="page-title">Private rooms that do not overstay.</h2>
        <p className="page-sub">
          Spin up a Doodle Chat session, invite friends, and let it self-destruct after 2.5 hours.
        </p>
        <div className="home-hero-actions">
          <button className="btn btn-x " onClick={() => navigate('/create')}>
            <Icon name="plus" size={18} />
            Create a session
          </button>
          <button className="btn btn-x" onClick={() => navigate('/join')}>
            <Icon name="key" size={18} />
            Join with a code
          </button>
        </div>
        <div className="home-stats">
          <div className="home-stat">
            <Icon name="chat" size={16} />
            <span className="home-stat-num">{sessions ? sessions.length : '–'}</span>
            <span>live rooms</span>
          </div>
          <div className="home-stat">
            <Icon name="users" size={16} />
            <span className="home-stat-num">{online === null ? '–' : online}</span>
            <span>people online</span>
          </div>
          <div className="home-stat">
            <Icon name="timer" size={16} />
            <span className="home-stat-num">2.5h</span>
            <span>then gone</span>
          </div>
        </div>
      </section>

      <div className="action-grid">
        <button type="button" className="action-card" onClick={() => navigate('/create')}>
          <div className="action-icon muted"><Icon name="plus" size={22} /></div>
          <h3>Create a session</h3>
          <p>Spin up a private room and share the code with friends.</p>
        </button>
        <button type="button" className="action-card" onClick={() => navigate('/join')}>
          <div className="action-icon muted "><Icon name="key" size={22} /></div>
          <h3>Join a session</h3>
          <p>Enter a code or pick from the rooms that are live right now.</p>
        </button>
        <button type="button" className="action-card" onClick={() => navigate('/changelog')}>
          <div className="action-icon muted"><Icon name="list" size={22} /></div>
          <h3>Changelog</h3>
          <p>See what shipped in recent updates or even past logs.</p>
        </button>
        <button type="button" className="action-card" onClick={() => navigate('/about')}>
          <div className="action-icon muted"><Icon name="info" size={22} /></div>
          <h3>About</h3>
          <p>How Doodle Chat works, and what it is for.</p>
        </button>
      </div>

      <section className="home-section">
        <div className="home-section-head">
          <h3>How it works</h3>
        </div>
        <div className="home-steps">
          {STEPS.map((step, i) => (
            <div className="home-step" key={step.title}>
              <div className="home-step-icon">
                <Icon name={step.icon} size={20} />
                <span className="home-step-n">{i + 1}</span>
              </div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h3>Built for short hangouts</h3>
        </div>
        <div className="home-features">
          {FEATURES.map((f) => (
            <div className="home-feature" key={f.title}>
              <div className="home-feature-icon"><Icon name={f.icon} size={18} /></div>
              <div>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card home-live">
        <div className="home-live-head">
          <div>
            <div className="card-title">Live rooms</div>
            <p className="home-live-sub">Jump into something already going, or start your own.</p>
          </div>
          <button className="btn btn-x btn-sm" onClick={() => navigate('/join')}>
            All rooms
            <Icon name="chevron" size={14} />
          </button>
        </div>
        {sessions === null && <div className="empty-note">Loading rooms…</div>}
        {sessions && sessions.length === 0 && (
          <div className="empty-note empty-note-with-icon">
            <Icon name="spark" size={22} />
            No sessions yet. Create one and send the code.
          </div>
        )}
        {sessions && sessions.slice(0, 4).map((s) => (
          <div className="session-row" key={s.code}>
            <div className="session-info">
              <div className="sname">{s.name}</div>
              <div className="smeta">
                <span className="code-badge">{s.code}</span>
                <span>{fmtTimeLeft(s.expiresAt - Date.now())}</span>
                <span>{s.memberCount} online</span>
              </div>
            </div>
            <button className="btn btn-x btn-sm" onClick={() => navigate(`/session/${s.code}`)}>Join</button>
          </div>
        ))}
      </section>
    </div>
  );
}