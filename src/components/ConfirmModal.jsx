export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  input = null, // { value, onChange, placeholder, maxLength }
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="close-x" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="eyebrow" style={{ marginBottom: 6 }}>Confirm</div>
        <h3 className="card-title" style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>
        {message && (
          <p style={{ margin: '0 0 16px', color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.45 }}>
            {message}
          </p>
        )}

        {input && (
          <div className="field" style={{ marginBottom: 16 }}>
            <input
              type="text"
              autoFocus
              maxLength={input.maxLength}
              placeholder={input.placeholder}
              value={input.value}
              onChange={(e) => input.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}