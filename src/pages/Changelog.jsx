import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Changelog() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.listChangelog()
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch((e) => {
        if (!cancelled) { setError(e.message); setEntries([]); }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page">
      <div className="eyebrow">Updates</div>
      <h2 className="page-title">Changelog</h2>
      <div className="card">
        {entries === null && <div className="empty-note">Loading…</div>}
        {error && <div className="error-text">{error}</div>}
        {entries && entries.length === 0 && !error && (
          <div className="empty-note">No changelog entries yet.</div>
        )}
        {entries && entries.map((c, i) => {
          const items = c.body.split('\n').map((line) => line.trim()).filter(Boolean);
          const label = i === 0 ? 'Latest' : new Date(c.createdAt).toLocaleDateString();
          return (
            <div className="changelog-entry" key={c.id}>
              <div className="v">
                {c.version}{' '}
                <span style={{ color: 'var(--text-dimmer)', fontWeight: 500 }}>— {label}</span>
              </div>
              <ul>{items.map((line, j) => <li key={j}>{line}</li>)}</ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}