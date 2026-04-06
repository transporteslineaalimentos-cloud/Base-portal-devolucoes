import { useMemo } from 'react';
import { HeroCard } from '../components/KPICard';
import KPICard from '../components/KPICard';
import { SO, TK } from '../config/constants';
import { fmt, getStatus, getTracking, buildAreaSummary, calcAging } from '../utils/helpers';
const COBR_ICON = (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>);
const PEND_ICON = (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58A6FF" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>);
const AGING_ICON = (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F85149" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
export default function Dashboard({ cobrNotes, pendNotes, statuses, onOpenTab, noteMeta = {} }) {
  const stC = useMemo(() => { const m = {}; SO.forEach(s => { m[s.v] = { n: 0, v: 0 }; }); cobrNotes.forEach(d => { const s = getStatus(d, statuses); if (!m[s]) m[s] = { n: 0, v: 0 }; m[s].n++; m[s].v += d.v; }); return m; }, [cobrNotes, statuses]);
  const tkC = useMemo(() => { const m = {}; TK.forEach(t => { m[t.v] = { n: 0, v: 0 }; }); pendNotes.forEach(d => { const t = getTracking(d, statuses); if (!m[t]) m[t] = { n: 0, v: 0 }; m[t].n++; m[t].v += d.v; }); return m; }, [pendNotes, statuses]);
  const areas = useMemo(() => buildAreaSummary([...cobrNotes, ...pendNotes]), [cobrNotes, pendNotes]);
  const pendAtivos = useMemo(() => pendNotes.filter(n => !['entregue','encaminhar','ret_nao_auto'].includes(getTracking(n, statuses))), [pendNotes, statuses]);
  const agingExp = useMemo(() => pendNotes.filter(n => { const d = calcAging(n); return d !== null && d > 30; }), [pendNotes]);
  const totalCobrPendente = (stC['pendente']?.v||0) + (stC['validado']?.v||0) + (stC['cobr_tr']?.v||0);
  const totalCobrPendenteN = (stC['pendente']?.n||0) + (stC['validado']?.n||0) + (stC['cobr_tr']?.n||0);
  const cobrTrend = [stC['cancelada']?.n||0, stC['cobrada']?.n||0, stC['emitida']?.n||0, totalCobrPendenteN].map((v,i) => v+i);
  const pendTrend = [0, pendAtivos.length*0.3, pendAtivos.length*0.6, pendAtivos.length*0.8, pendAtivos.length].map(v => Math.round(v));
  const agingTrend = [0, agingExp.length*0.2, agingExp.length*0.5, agingExp.length*0.8, agingExp.length].map(v => Math.round(v));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <HeroCard label="Cobranças em aberto" value={totalCobrPendenteN} sub={fmt(totalCobrPendente)} color="var(--gold)" trend={cobrTrend} icon={COBR_ICON} onClick={() => onOpenTab('cobranca')} />
        <HeroCard label="Devoluções pendentes" value={pendAtivos.length} sub={fmt(pendAtivos.reduce((s,n)=>s+n.v,0))} color="var(--blue)" trend={pendTrend} icon={PEND_ICON} onClick={() => onOpenTab('lancamento')} />
        <HeroCard label="Aging expirado (>30d)" value={agingExp.length} sub={fmt(agingExp.reduce((s,n)=>s+n.v,0))} color="var(--red)" trend={agingTrend} icon={AGING_ICON} onClick={() => onOpenTab('aging')} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Pipeline de Cobrança</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
          {SO.filter(s => !['cancelada'].includes(s.v)).map(s => <KPICard key={s.v} label={s.l} value={stC[s.v]?.n||0} sub={fmt(stC[s.v]?.v||0)} color={s.c} onClick={() => onOpenTab('cobranca', { status: s.v })} />)}
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Pipeline de Devoluções</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
          {TK.filter(t => !['encaminhar','ret_nao_auto'].includes(t.v)).map(t => <KPICard key={t.v} label={`${t.i} ${t.l}`} value={tkC[t.v]?.n||0} sub={fmt(tkC[t.v]?.v||0)} color={t.c} onClick={() => onOpenTab('lancamento', { status: t.v })} />)}
        </div>
      </div>
      {areas.length>0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Por área responsável</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {areas.map(area => <KPICard key={area.area} label={area.area} value={area.count} sub={fmt(area.value)} color="var(--text-3)" onClick={() => onOpenTab('lancamento', { area: area.area })} />)}
          </div>
        </div>
      )}
    </div>
  );
}
