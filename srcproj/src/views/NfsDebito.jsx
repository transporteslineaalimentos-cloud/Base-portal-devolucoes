import { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/excel';
import { fmt, fmtDateTime } from '../utils/helpers';

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
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar NF Débito, NFD, NFO ou pedido..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs outline-none" />
        <button onClick={() => exportToExcel(filtered.flatMap(g => g.notes.map(n => ({ nfDeb: g.nfDeb, pedido: g.pedido, nfd: n.nfd, nfo: n.nfo, cliente: n.cl, valor: n.v }))), 'nfs_debito')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Excel desta aba</button>
      </div>
      <div className="space-y-2">
        {filtered.map(group => (
          <div key={group.nfDeb} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full text-left px-4 py-3 flex items-center justify-between gap-3" onClick={() => setExpanded(expanded === group.nfDeb ? '' : group.nfDeb)}>
              <div>
                <div className="text-sm font-bold text-[#1a365d]">NF Débito {group.nfDeb}</div>
                <div className="text-[11px] text-gray-500">{group.notes.length} nota(s) · Pedido {group.pedido || '—'}</div>
              </div>
              <div className="text-right"><div className="text-sm font-bold">{fmt(group.totalValue || 0)}</div><div className="text-[10px] text-gray-400">{group.pdfUrl ? 'PDF anexado' : 'Sem PDF'}</div></div>
            </button>
            {expanded === group.nfDeb && (
              <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                {group.pdfUrl && <a href={group.pdfUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-semibold text-blue-600">📄 Abrir PDF</a>}
                <div className="mt-3 overflow-auto rounded-xl border border-gray-200 bg-white">
                  <table className="w-full text-[11px]"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">NFD</th><th className="px-3 py-2 text-left">NFO</th><th className="px-3 py-2 text-left">Cliente</th><th className="px-3 py-2 text-left">Motivo</th><th className="px-3 py-2 text-right">Valor</th></tr></thead><tbody>{group.notes.map((n, idx) => <tr key={idx} className={idx % 2 ? 'bg-gray-50/50' : ''}><td className="px-3 py-2">{n.nfd}</td><td className="px-3 py-2">{n.nfo}</td><td className="px-3 py-2">{n.cl}</td><td className="px-3 py-2">{n.mo}</td><td className="px-3 py-2 text-right">{fmt(n.v)}</td></tr>)}</tbody></table>
                </div>
                <div className="mt-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">Histórico vinculado</div>
                  {group.history.map((h, idx) => <div key={idx} className="text-[10px] text-gray-500 py-0.5">{fmtDateTime(h.created_at)} · <strong>{h.action}</strong> · {h.status_to}</div>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
