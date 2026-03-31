import { useMemo, useState } from 'react';
import { fmt } from '../utils/helpers';
import { exportToExcel } from '../utils/excel';

export default function Transportadores({ summary = [], getEmails, setEmails, onOpenFiltered }) {
  const [search, setSearch] = useState('');
  const [editName, setEditName] = useState('');
  const [email, setEmail] = useState('');
  const filtered = useMemo(() => summary.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [summary, search]);

  const openEdit = (name) => { setEditName(name); setEmail(getEmails(name)); };
  const save = async () => { await setEmails(editName, email); setEditName(''); setEmail(''); alert('Emails atualizados.'); };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar transportador..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs outline-none" />
        <button onClick={() => exportToExcel(filtered, 'transportadores')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Excel desta aba</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        {filtered.map(tr => (
          <div key={tr.name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#1a365d]">{tr.name}</div>
                <div className="text-[11px] text-gray-500">{tr.count} ocorrências · {fmt(tr.value)}</div>
                <div className="text-[11px] text-gray-400 mt-1">Email(s): {getEmails(tr.name) || 'não cadastrado'}</div>
              </div>
              <button onClick={() => openEdit(tr.name)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] font-semibold">Editar email</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button onClick={() => onOpenFiltered(tr.name, 'cobr')} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-left"><div className="text-[10px] font-bold text-blue-700 uppercase">Cobrança</div><div className="text-lg font-bold text-blue-800">{tr.cobr}</div></button>
              <button onClick={() => onOpenFiltered(tr.name, 'pend')} className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-left"><div className="text-[10px] font-bold text-orange-700 uppercase">Lançamento</div><div className="text-lg font-bold text-orange-800">{tr.pend}</div></button>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-left"><div className="text-[10px] font-bold text-gray-700 uppercase">Total</div><div className="text-lg font-bold text-gray-800">{tr.count}</div></div>
            </div>
          </div>
        ))}
      </div>

      {editName && (
        <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-base font-bold text-gray-800">Editar email do transportador</h2></div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-500">{editName}</div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email1@...; email2@..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button onClick={() => setEditName('')} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancelar</button><button onClick={save} className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
