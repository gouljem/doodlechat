import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';

function fmtTimeLeft(ms) {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}
function fmtClock(ts) {
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ap}`;
}

export default function Chat() {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const { profile, isAdmin, showToast } = useApp();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [timeLeft, setTimeLeft] = useState('--');
  const [input, setInput] = useState('');
  const msgsAreaRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Load session once
  useEffect(() => {
    let cancelled = false;
    api.getSession(code)
      .then((s) => { if (!cancelled) setSession(s); })
      .catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [code]);

  const leave = useCallback(() => {
    api.leaveSession(code, profile.username).catch(() => {});
  }, [code, profile.username]);

  useEffect(() => {
    if (notFound) {
      showToast('That session does not exist or has expired.');
      navigate('/home');
    }
  }, [notFound, navigate, showToast]);

  // Countdown + expiry watch
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const left = session.expiresAt - Date.now();
      if (left <= 0) {
        showToast('This session has expired.');
        navigate('/home');
        return;
      }
      setTimeLeft(fmtTimeLeft(left));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, navigate, showToast]);

  // Messages + members: initial load, then live via Realtime (no more polling).
  // Presence heartbeat still runs on an interval since that's a write (marks
  // us as "still here"), not something Realtime can do for us.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadMsgs() {
      try {
        const msgs = await api.listMessages(code);
        if (!cancelled) setMessages(msgs);
      } catch (e) { /* transient */ }
    }
    async function loadMembers() {
      try {
        const m = await api.listMembers(code);
        if (!cancelled) setMembers(m);
      } catch (e) { /* transient */ }
    }
    function heartbeat() {
      api.heartbeat(code, profile.username, profile.avatarId, isTypingRef.current, isAdmin).catch(() => {});
    }

    loadMsgs();
    loadMembers();
    heartbeat();

    const unsubMessages = api.subscribeMessages(code, (msg) => {
      if (cancelled) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    // Presence rows change often (typing, heartbeats, joins/leaves) — just
    // refetch the member list on any change rather than hand-merging events.
    const unsubPresence = api.subscribePresence(code, loadMembers);

    const presenceTimer = setInterval(heartbeat, 5000);
    // Realtime can miss a disconnect (closed tab, dropped socket), so keep a
    // slow safety-net poll for members too.
    const memberSafetyTimer = setInterval(loadMembers, 10000);

    window.addEventListener('beforeunload', leave);

    return () => {
      cancelled = true;
      unsubMessages();
      unsubPresence();
      clearInterval(presenceTimer);
      clearInterval(memberSafetyTimer);
      window.removeEventListener('beforeunload', leave);
      leave();
    };
  }, [session, code, profile.username, profile.avatarId, isAdmin, leave]);

  // Autoscroll on new messages
  useEffect(() => {
    const area = msgsAreaRef.current;
    if (!area) return;
    const wasNearBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 80;
    if (wasNearBottom) area.scrollTop = area.scrollHeight;
  }, [messages]);

  function handleTyping(value) {
    setInput(value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      api.heartbeat(code, profile.username, profile.avatarId, true, isAdmin).catch(() => {});
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      api.heartbeat(code, profile.username, profile.avatarId, false, isAdmin).catch(() => {});
    }, 1800);
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    isTypingRef.current = false;
    api.heartbeat(code, profile.username, profile.avatarId, false, isAdmin).catch(() => {});
    try {
      await api.sendMessage(code, profile.username, profile.avatarId, text);
      // No manual refetch needed — the Realtime subscription above will
      // deliver this message (and anyone else's) as soon as it's inserted.
    } catch (e) {
      showToast(e.message);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => showToast('Code copied!')).catch(() => showToast(`Code: ${code}`));
  }

  function handleLeaveClick() {
    leave();
    navigate('/home');
  }

  if (!session) {
    return <div className="page"><div className="loading-note">Loading session…</div></div>;
  }

  const typingOthers = members.filter((m) => m.typing && m.username !== profile.username).map((m) => m.username);

  return (
    <div className="page wide">
      <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ cursor: 'pointer' }} onClick={handleLeaveClick}>← Leave</span>
      </div>
      <div className="chat-shell">
        <div className="card chat-card">
          <div className="chat-header">
            <div>
              <div className="cname">{session.name}</div>
              <div className="chdr-meta">
                <span className="code-badge">{session.code}</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={copyCode}>copy code</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <div className="timer-pill">{timeLeft}</div>
              <div className="icon-btn" onClick={() => setShowMembers((v) => !v)}>
                👥<span className="member-count-dot">{members.length}</span>
              </div>
            </div>
          </div>
          <div className="msgs" ref={msgsAreaRef}>
            {messages.length === 0 && <div className="empty-note">No messages yet. Say hi! 👋</div>}
            {messages.map((m) => {
              const mine = m.user === profile.username;
              return (
                <div className={'msg' + (mine ? ' me' : '')} key={m.id}>
                  <div className="av"><Avatar id={m.avatarId} size="100%" /></div>
                  <div>
                    {!mine && <div className="who">{m.user}</div>}
                    <div className="bubble">{m.text}</div>
                    <div className="ts">{fmtClock(m.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="typing-row">
            {typingOthers.length > 0 && `${typingOthers.join(', ')} ${typingOthers.length > 1 ? 'are' : 'is'} typing…`}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              maxLength={500}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn btn-primary send-btn" onClick={send}>Send</button>
          </div>
        </div>
        <div className={'card member-panel' + (showMembers ? ' open' : '')}>
          <div className="card-title" style={{ marginBottom: 12 }}>Members</div>
          {members.length === 0 && <div className="empty-note">Just you so far.</div>}
          {[...members].sort((a, b) => a.username.localeCompare(b.username)).map((m) => (
            <div className="member-row" key={m.username}>
              <span className="mav"><Avatar id={m.avatarId} size="100%" /></span>
              <div>
                <div className="mname">
                  {m.username}
                  {m.username === session.createdBy && <span className="crown" title="Creator">👑</span>}
                  {m.isAdmin && <span className="admin-pill">ADMIN</span>}
                </div>
                {m.typing && <div className="member-typing">typing…</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
