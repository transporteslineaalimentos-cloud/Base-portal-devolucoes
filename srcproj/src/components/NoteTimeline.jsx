import { useMemo } from 'react';

const COLORS = {
  'Status':          { bg: 'var(--gold-dim)',   dot: '#A68B5C', ic: '⟳' },
  'Status NF Débito':{ bg: 'rgba(188,140,255,.12)', dot: '#BC8CFF', ic: '📄' },
  'Tracking':        { bg: 'var(--blue-dim)',   dot: '#58A6FF', ic: '📦' },
  'Transportador vinculado':{ bg: 'rgba(63,185,80,.1)', dot: '#3FB950', ic: '🚛' },
  'Prioridade':      { bg: 'rgba(210,153,34,.12)', dot: '#D29922', ic: '⚑' },
  'Nota':            { bg: 'var(--surface-2)',  dot: '#8B949E', ic: '✏️' },
};

function diffLabel(ms) {
  if (ms < 60000) return 'segundos atrás';
  if (ms < 3600000) return `${Math.floor(ms/60000)}min`;
  if (ms < 86400000) return `${Math.floor(ms/3600000)}h`;
  return `${Math.floor(ms/86400000)}d`;
}

function durationBetween(a, b) {
  const ms = Math.abs(new Date(a) - new Date(b));
  if (ms < 60000) return null; // menos de 1min — irrelevante exibir
  if (ms < 3600000) return { label: `${Math.floor(ms/60000)} min nessa etapa`, warn: false };
  if (ms < 86400000) return { label: `${Math.floor(ms/3600000)}h nessa etapa`, warn: ms > 43200000 };
  const days = Math.floor(ms/86400000);
  return { label: `${days} dia${days>1?'s':''} nessa etapa`, warn: days > 3 };
}

function initials(name = '') {
  return name.trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
}

export default function NoteTimeline({ history = [], noteKey = '' }) {
  const events = useMemo(() => {
    const h = history
      .filter(e => e.nf_key === noteKey)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return h;
  }, [history, noteKey]);

  if (!events.length) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Nenhum evento registrado ainda.</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>As alterações de status e ações aparecerão aqui.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingBottom: 24 }}>
      {/* Linha vertical central */}
      <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border)', borderRadius: 1 }} />

      {events.map((ev, i) => {
        const c = COLORS[ev.action] || COLORS['Nota'];
        const prev = events[i - 1];
        const dur = prev ? durationBetween(prev.created_at, ev.created_at) : null;
        const dt = new Date(ev.created_at);
        const dateStr = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
        const timeStr = dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        const isLast = i === events.length - 1;

        return (
          <div key={ev.id || i}>
            {/* Indicador de duração entre eventos */}
            {dur && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 40, marginBottom: 4, marginTop: 4 }}>
                <div style={{ fontSize: 10, color: dur.warn ? '#D29922' : 'var(--text-3)', fontStyle: 'italic', fontWeight: dur.warn ? 600 : 400 }}>
                  {dur.warn ? '⚠ ' : ''}{dur.label}
                </div>
              </div>
            )}

            {/* Evento */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, position: 'relative' }}>
              {/* Dot na linha */}
              <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: c.bg, border: `2px solid ${c.dot}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isLast ? 16 : 14,
                  boxShadow: isLast ? `0 0 0 4px ${c.bg}` : 'none',
                }}>
                  {c.ic}
                </div>
              </div>

              {/* Conteúdo */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px',
                  borderLeft: `3px solid ${c.dot}`,
                }}>
                  {/* Header do evento */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.dot }}>{ev.action}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {dateStr} · {timeStr}
                    </div>
                  </div>

                  {/* De → Para */}
                  {ev.status_from && ev.status_to && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4 }}>
                        {ev.status_from}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>→</span>
                      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, background: `${c.dot}18`, padding: '2px 8px', borderRadius: 4, border: `1px solid ${c.dot}30` }}>
                        {ev.status_to}
                      </span>
                    </div>
                  )}

                  {/* Observação */}
                  {ev.observation && (
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic', marginBottom: 6, padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>
                      "{ev.observation}"
                    </div>
                  )}

                  {/* Usuário */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: ev.user_email?.includes('transportad') || ev.user_name?.toLowerCase()?.includes('fast') || ev.user_name?.toLowerCase()?.includes('nagami') || ev.user_name?.toLowerCase()?.includes('tecmar') || ev.user_name?.toLowerCase()?.includes('rec ') ? 'rgba(88,166,255,0.2)' : 'rgba(166,139,92,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                      color: ev.user_email?.includes('transportad') ? '#58A6FF' : '#A68B5C',
                      flexShrink: 0,
                    }}>
                      {initials(ev.user_name)}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.user_name || 'Sistema'}</span>
                    {isLast && <span style={{ fontSize: 9, background: '#3FB95018', color: '#3FB950', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Atual</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Marcador "Agora" no final */}
      <div style={{ display: 'flex', gap: 14, marginTop: 4, position: 'relative' }}>
        <div style={{ width: 40, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3FB950', boxShadow: '0 0 0 3px rgba(63,185,80,0.2)' }} />
        </div>
        <div style={{ fontSize: 11, color: '#3FB950', fontWeight: 600, paddingTop: 4 }}>Status atual</div>
      </div>
    </div>
  );
}
