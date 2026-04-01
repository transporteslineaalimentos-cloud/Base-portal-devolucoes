import { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/excel';
import { fmtDateTime, translateStatusLabel } from '../utils/helpers';

export default function AuditLog({ audit = [] }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return audit;
    const q = search.toLowerCase();
    return audit.filter(a => [a.nf_key, a.usuario, a.acao, a.campo, a.valor_novo].join(' ').toLowerCase().includes(q));
  }, [audit, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar auditoria..." className="input" style={{ flex: 1 }} />
        <button onClick={() => exportToExcel(filtered, 'auditoria')} className="btn btn-outline btn-sm">⬇ Excel</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Data', 'Nota', 'Usuário', 'Perfil', 'Ação', 'Campo', 'De', 'Para', 'Origem'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Nenhum registro</td></tr>
              ) : filtered.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDateTime(a.created_at)}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)' }}>{a.nf_key}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text)' }}>{a.usuario}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11 }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-2)', fontSize: 10 }}>{a.perfil}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>{a.acao}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-3)' }}>{a.campo}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--red)', opacity: 0.8 }}>{translateStatusLabel(a.valor_anterior) || '—'}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{translateStatusLabel(a.valor_novo) || '—'}</td>
                  <td style={{ padding: '9px 14px', fontSize: 10, color: 'var(--text-3)' }}>{a.origem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
