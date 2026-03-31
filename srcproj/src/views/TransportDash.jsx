import KPICard from '../components/KPICard';
import { fmt, isLancActive, getStatus } from '../utils/helpers';

export default function TransportDash({ myC = [], myP = [], statuses, onOpenTab, transporterName }) {
  const pAct = myP.filter(d => isLancActive(d, statuses));
  const cPend = myC.filter(d => getStatus(d, statuses) === 'cobr_tr');
  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-xs text-[#1a365d]">Bem-vindo ao Portal — {transporterName}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total devoluções" value={myC.length + myP.length} sub={fmt(myC.reduce((s, d) => s + d.v, 0) + myP.reduce((s, d) => s + d.v, 0))} color="#1a365d" onClick={() => onOpenTab('tr_retorno')} />
        <KPICard label="Retornos pendentes" value={pAct.length} sub={fmt(pAct.reduce((s, d) => s + d.v, 0))} color="#d97706" onClick={() => onOpenTab('tr_retorno')} />
        <KPICard label="Cobranças pend." value={cPend.length} sub={fmt(cPend.reduce((s, d) => s + d.v, 0))} color="#7c3aed" onClick={() => onOpenTab('tr_cobranca')} />
      </div>
    </div>
  );
}
