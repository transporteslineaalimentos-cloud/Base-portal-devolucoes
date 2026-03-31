import KPICard from '../components/KPICard';
import { SO, TK } from '../config/constants';
import { fmt, getStatus, getTracking, buildAreaSummary } from '../utils/helpers';
import DashboardAdvanced from './DashboardAdvanced';

export default function Dashboard({ cobrNotes, pendNotes, statuses, onOpenTab, noteMeta = {} }) {
  const stC = {}; SO.forEach(s => { stC[s.v] = { n: 0, v: 0 }; });
  cobrNotes.forEach(d => { const s = getStatus(d, statuses); if (!stC[s]) stC[s] = { n: 0, v: 0 }; stC[s].n++; stC[s].v += d.v; });
  const tkC = {}; TK.forEach(t => { tkC[t.v] = { n: 0, v: 0 }; });
  pendNotes.forEach(d => { const t = getTracking(d, statuses); if (!tkC[t]) tkC[t] = { n: 0, v: 0 }; tkC[t].n++; tkC[t].v += d.v; });
  const areas = buildAreaSummary([...cobrNotes, ...pendNotes]);

  return (
    <div>
      <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Cobrança</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {SO.filter(s => ['pendente','validado','emitida','cobrada','paga'].includes(s.v)).map(s =>
          <KPICard key={s.v} label={s.l} value={stC[s.v]?.n || 0} sub={fmt(stC[s.v]?.v || 0)} color={s.c} onClick={() => onOpenTab('cobranca', { status: s.v })} />)}
      </div>
      <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Tracking</div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {TK.filter(t => !['encaminhar','ret_nao_auto'].includes(t.v)).map(t =>
          <KPICard key={t.v} label={`${t.i} ${t.l}`} value={tkC[t.v]?.n || 0} sub={fmt(tkC[t.v]?.v || 0)} color={t.c} onClick={() => onOpenTab('lancamento', { status: t.v })} />)}
      </div>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {areas.map(area => <KPICard key={area.area} label={area.area} value={area.count} sub={fmt(area.value)} color="#1a365d" onClick={() => onOpenTab('lancamento', { area: area.area })} />)}
      </div>
      <DashboardAdvanced cobrNotes={cobrNotes} pendNotes={pendNotes} statuses={statuses} noteMeta={noteMeta} />
    </div>
  );
}
