import { useMemo } from 'react';
import KPICard from '../components/KPICard';
import { fmt, calcAging, getTransporter } from '../utils/helpers';
import { exportToExcel } from '../utils/excel';

export default function Aging({ pendNotes = [], extras = {}, onOpenFiltered }) {
  const active = pendNotes.map(d => ({ ...d, aging: calcAging(d) || 0 }));
  const exp = active.filter(d => d.aging > 30), near = active.filter(d => d.aging >= 20 && d.aging <= 30), ok = active.filter(d => d.aging < 20);
  const offenders = useMemo(() => {
    const map = {};
    active.forEach(n => { const tr = getTransporter(n, extras) || 'Não identificado'; if (!map[tr]) map[tr] = { name: tr, count: 0, value: 0 }; map[tr].count += 1; map[tr].value += n.v || 0; });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [pendNotes, extras]);

  return (
    <div>
      <div className="flex justify-end mb-3"><button onClick={() => exportToExcel(active, 'aging')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold">Excel desta aba</button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <KPICard label="🔴 Expiradas (>30d)" value={exp.length} sub={fmt(exp.reduce((s, d) => s + d.v, 0))} color="#dc2626" onClick={() => onOpenFiltered('expirado')} />
        <KPICard label="🟡 Próximo (20-30d)" value={near.length} sub={fmt(near.reduce((s, d) => s + d.v, 0))} color="#d97706" onClick={() => onOpenFiltered('proximo')} />
        <KPICard label="🟢 No Prazo (<20d)" value={ok.length} sub={fmt(ok.reduce((s, d) => s + d.v, 0))} color="#059669" onClick={() => onOpenFiltered('ok')} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Transportadores ofensores</div>
          <div className="space-y-2">{offenders.map(tr => <button key={tr.name} onClick={() => onOpenFiltered(tr.name)} className="w-full flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50"><div><div className="text-sm font-semibold text-[#1a365d]">{tr.name}</div><div className="text-[11px] text-gray-400">{tr.count} nota(s)</div></div><div className="text-sm font-bold">{fmt(tr.value)}</div></button>)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Distribuição</div>
          {[{ label: 'Expirado', list: exp, color: 'bg-red-500' }, { label: 'Próximo', list: near, color: 'bg-yellow-500' }, { label: 'No prazo', list: ok, color: 'bg-green-500' }].map(item => {
            const total = active.length || 1;
            const pct = (item.list.length / total) * 100;
            return <div key={item.label} className="mb-4"><div className="flex items-center justify-between text-sm mb-1"><span>{item.label}</span><span>{item.list.length} · {fmt(item.list.reduce((s, d) => s + d.v, 0))}</span></div><div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} /></div></div>;
          })}
        </div>
      </div>
    </div>
  );
}
