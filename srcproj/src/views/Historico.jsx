import { useState } from 'react';
import { fmtDateTime } from '../utils/helpers';
import { exportToExcel } from '../utils/excel';

export default function Historico({ history = [] }) {
  const [search, setSearch] = useState('');
  let f = history;
  if (search) {
    const t = search.toLowerCase().split(';').map(v => v.trim()).filter(Boolean);
    f = f.filter(h => t.some(q => (h.nf_key || '').toLowerCase().includes(q) || (h.user_name || '').toLowerCase().includes(q) || (h.action || '').toLowerCase().includes(q)));
  }
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs outline-none" />
        <button onClick={() => exportToExcel(f, 'historico')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Excel desta aba</button>
      </div>
      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-[11px]"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left text-[10px] text-gray-400">Data</th><th className="px-3 py-2 text-left">NFD</th><th className="px-3 py-2 text-left">NFO</th><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Obs</th><th className="px-3 py-2 text-left">Usuário</th></tr></thead>
          <tbody>{f.map((h, i) => { const p = (h.nf_key || '').split('|'); return <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}><td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDateTime(h.created_at)}</td><td className="px-3 py-2 font-mono font-semibold">{p[0]}</td><td className="px-3 py-2 font-mono font-semibold">{p[1]}</td><td className="px-3 py-2">{h.action}</td><td className="px-3 py-2 font-semibold">{h.status_to}</td><td className="px-3 py-2 text-blue-600 max-w-[200px] truncate">{h.observation}</td><td className="px-3 py-2 text-purple-500 font-semibold">{h.user_name}</td></tr>; })}</tbody></table>
      </div>
    </div>
  );
}
