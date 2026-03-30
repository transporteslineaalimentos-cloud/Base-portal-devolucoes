import { useState, useRef, useEffect } from 'react';

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default function TransportChips({ transporters = [], active = [], onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!transporters.length) return null;

  const activeCount = active.length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn btn-outline btn-sm"
        style={{
          borderColor: activeCount > 0 ? 'rgba(166,139,92,0.4)' : undefined,
          color: activeCount > 0 ? 'var(--gold)' : undefined,
          gap: 6,
        }}
      >
        Transportadora
        {activeCount > 0 && (
          <span style={{ background: 'var(--gold)', color: '#0B0E14', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
            {activeCount}
          </span>
        )}
        <span style={{ opacity: 0.6 }}><ChevronIcon /></span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-lg)',
          minWidth: 260,
          maxHeight: 280,
          overflowY: 'auto',
          zIndex: 100,
          animation: 'scaleIn 160ms ease',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Transportadoras ({transporters.length})
            </span>
            {activeCount > 0 && (
              <button
                onClick={() => { transporters.forEach(t => { if (active.includes(t.name)) onToggle(t.name); }); }}
                style={{ fontSize: 10, color: 'var(--red)', opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Limpar seleção
              </button>
            )}
          </div>
          {transporters.map(({ name, count }) => {
            const isActive = active.includes(name);
            return (
              <button
                key={name}
                onClick={() => onToggle(name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  gap: 8,
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 120ms',
                  textAlign: 'left',
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${isActive ? 'var(--gold)' : 'var(--border-2)'}`,
                  background: isActive ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isActive && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0E14" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: isActive ? 'var(--gold)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                  {name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 8 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
