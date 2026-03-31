import { fmtDateTime } from '../utils/helpers';

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0"/>
  </svg>
);

export default function NotificationBell({ items = [], open = false, onToggle, onRead }) {
  const unread = items.filter(i => !i.lido).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        className="btn btn-ghost btn-sm"
        style={{ padding: '6px 8px', position: 'relative' }}
      >
        <BellIcon />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--red)', color: '#fff',
            fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Notificações</span>
            {unread > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{unread} não lida(s)</span>}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
              Sem notificações
            </div>
          ) : (
            items.slice(0, 8).map((n, idx) => (
              <button
                key={n.id || idx}
                onClick={() => onRead?.(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                  background: n.lido ? 'transparent' : 'rgba(166,139,92,0.05)',
                  cursor: 'pointer', border: 'none', borderBottom: '1px solid var(--border)',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = n.lido ? 'transparent' : 'rgba(166,139,92,0.05)'}
              >
                <div style={{ fontSize: 12, fontWeight: n.lido ? 400 : 600, color: 'var(--text)', marginBottom: 2 }}>
                  {n.titulo}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{n.mensagem}</div>
                {n.created_at && (
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{fmtDateTime(n.created_at)}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
