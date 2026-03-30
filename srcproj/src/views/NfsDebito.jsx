import { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/excel';
import { fmt, fmtDateTime } from '../utils/helpers';

const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);

export default function NfsDebito({ groups = [] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState('');
  const filtered = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      String(g.nfDeb || '').toLowerCase().includes(q) ||
      String(g.pedido || '').toLowerCase().includes(q) ||
      g.notes.some(n => String(n.nfd || '').toLowerCase().includes(q) || String(n.nfo || '').toLowerCase().includes(q))
    );
  }, [groups, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar NF Débito, NFD, NFO ou pedido..."
          className="input" style={{ flex: 1 }} />
        <button onClick={() => exportToExcel(filtered.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))), 'nfs_debito')}
          className="btn btn-outline btn-sm">⬇ Excel</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Nenhuma NF Débito registrada ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(group => (
            <div key={group.nfDeb} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', transition: 'border-color 160ms' }}>
              <button
                style={{ width: '100%', textAlign: 'left', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === group.nfDeb ? '' : group.nfDeb)}
                onMouseEnter={e => e.currentTarget.parentElement.style.borderColor = 'var(--border-2)'}
                onMouseLeave={e => e.currentTarget.parentElement.style.borderColor = 'var(--border)'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>NF Débito {group.nfDeb}</span>
                    {group.pedido && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Pedido {group.pedido}</span>}
                    {group.pdfUrl && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, padding: '1px 6px', background: 'var(--green-dim)', borderRadius: 4 }}>PDF ✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{group.notes.length} nota(s) vinculada(s)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.totalValue || 0)}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{expanded === group.nfDeb ? '▾' : '▸'}</span>
                </div>
              </button>

              {expanded === group.nfDeb && (
                <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  {group.pdfUrl && (
                    <a href={group.pdfUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gold)', textDecoration: 'none', padding: '7px 12px', background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.2)', borderRadius: 8, margin: '12px 0' }}>
                      <FileIcon /> Abrir PDF da NF Débito
                    </a>
                  )}

                  <div style={{ marginTop: group.pdfUrl ? 0 : 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                          {['NFD', 'NFO', 'Cliente', 'Motivo', 'Valor'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Valor' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.notes.map((n, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text)', fontFamily: 'monospace' }}>{n.nfd || '—'}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{n.nfo}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{n.cl}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--red)', opacity: 0.8, fontSize: 11 }}>{n.mo}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{fmt(n.v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {group.history?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Histórico</div>
                      {group.history.map((h, idx) => (
                        <div key={idx} style={{ fontSize: 11, color: 'var(--text-3)', padding: '3px 0', borderBottom: idx < group.history.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          {fmtDateTime(h.created_at)} · <strong style={{ color: 'var(--text-2)' }}>{h.action}</strong> · {h.status_to}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
