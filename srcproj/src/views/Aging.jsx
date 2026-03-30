import { useMemo } from 'react';
import { fmt, calcAging, getTransporter } from '../utils/helpers';
import { exportToExcel } from '../utils/excel';

export default function Aging({ pendNotes = [], extras = {}, onOpenFiltered }) {
  const active = pendNotes.map(d => ({ ...d, aging: calcAging(d) || 0 }));
  const exp   = active.filter(d => d.aging > 30);
  const near  = active.filter(d => d.aging >= 20 && d.aging <= 30);
  const ok    = active.filter(d => d.aging < 20);

  const offenders = useMemo(() => {
    const map = {};
    exp.forEach(n => {
      const tr = getTransporter(n, extras) || 'Não identificado';
      if (!map[tr]) map[tr] = { name: tr, count: 0, value: 0 };
      map[tr].count++;
      map[tr].value += n.v || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [pendNotes, extras]);

  const total = active.length || 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => exportToExcel(active, 'aging')} className="btn btn-outline btn-sm">⬇ Excel</button>
      </div>

      {/* Hero cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Expiradas (>30d)', list: exp, color: 'var(--red)', bg: 'var(--red-dim)', border: 'rgba(248,81,73,0.25)', cat: 'expirado' },
          { label: 'Próximo prazo (20-30d)', list: near, color: 'var(--yellow)', bg: 'var(--yellow-dim)', border: 'rgba(210,153,34,0.25)', cat: 'proximo' },
          { label: 'No prazo (<20d)', list: ok, color: 'var(--green)', bg: 'var(--green-dim)', border: 'rgba(63,185,80,0.25)', cat: 'ok' },
        ].map(({ label, list, color, bg, border, cat }) => (
          <button key={cat} onClick={() => onOpenFiltered(cat)}
            style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 180ms', borderLeft: `3px solid ${color}` }}
            onMouseEnter={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = border; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = color; }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{list.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{fmt(list.reduce((s, d) => s + d.v, 0))}</div>
            <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: color, width: `${(list.length / total) * 100}%`, borderRadius: 2 }} />
            </div>
          </button>
        ))}
      </div>

      {/* Offenders */}
      {offenders.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Transportadores com aging expirado</div>
          </div>
          {offenders.map((tr, i) => {
            const maxVal = offenders[0]?.value || 1;
            return (
              <button key={tr.name} onClick={() => onOpenFiltered(tr.name)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px 18px', gap: 12, background: 'none', border: 'none', borderBottom: i < offenders.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{tr.name}</div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--red)', width: `${(tr.value / maxVal) * 100}%`, borderRadius: 2, opacity: 0.7 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{fmt(tr.value)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{tr.count} nota(s)</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
