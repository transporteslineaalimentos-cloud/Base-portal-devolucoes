import { useState } from 'react';
import { fmtDateTime, translateStatusLabel } from '../utils/helpers';
import { exportToExcel } from '../utils/excel';

export default function Historico({ history = [] }) {
  const [search, setSearch] = useState('');
  let f = history;
  if (search) {
    const t = search.toLowerCase().split(';').map(v => v.trim()).filter(Boolean);
    f = f.filter(h => t.some(q =>
      (h.nf_key || '').toLowerCase().includes(q) ||
      (h.user_name || '').toLowerCase().includes(q) ||
      (h.action || '').toLowerCase().includes(q)
    ));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nota, usuário, ação... (use ; para múltiplos)"
            className="input" style={{ paddingLeft: 12 }} />
        </div>
        <button onClick={() => exportToExcel(f, 'historico')} className="btn btn-outline btn-sm">⬇ Excel</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Data/Hora', 'NFD', 'NFO', 'Ação', 'Status', 'Observação', 'Usuário'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nenhum registro encontrado</td></tr>
              ) : f.map((h, i) => {
                const p = (h.nf_key || '').split('|');
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDateTime(h.created_at)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>{p[0] || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>{p[1] || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>{h.action}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{translateStatusLabel(h.status_to)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--blue)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.observation || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--purple)', fontWeight: 500 }}>{h.user_name || 'Sistema'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
