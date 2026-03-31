import { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/excel';
import { fmtDateTime } from '../utils/helpers';

export default function AuditLog({ audit = [] }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return audit;
    const q = search.toLowerCase();
    return audit.filter(a => [a.nf_key, a.usuario, a.acao, a.campo, a.valor_novo].join(' ').toLowerCase().includes(q));
  }, [audit, search]);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar auditoria..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs outline-none" />
        <button onClick={() => exportToExcel(filtered, 'auditoria')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Excel desta aba</button>
      </div>
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-[11px]"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Nota</th><th className="px-3 py-2 text-left">Usuário</th><th className="px-3 py-2 text-left">Perfil</th><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-left">Campo</th><th className="px-3 py-2 text-left">De</th><th className="px-3 py-2 text-left">Para</th><th className="px-3 py-2 text-left">Origem</th></tr></thead>
          <tbody>{filtered.map((a, i) => <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}><td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(a.created_at)}</td><td className="px-3 py-2 font-mono">{a.nf_key}</td><td className="px-3 py-2">{a.usuario}</td><td className="px-3 py-2">{a.perfil}</td><td className="px-3 py-2">{a.acao}</td><td className="px-3 py-2">{a.campo}</td><td className="px-3 py-2">{a.valor_anterior}</td><td className="px-3 py-2">{a.valor_novo}</td><td className="px-3 py-2">{a.origem}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
