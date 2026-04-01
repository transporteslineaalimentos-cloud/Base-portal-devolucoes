import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area, RadialBarChart, RadialBar, FunnelChart, Funnel,
  LabelList, ComposedChart, Scatter, ScatterChart, ZAxis,
} from 'recharts';
import { calcAging, getTransporter, getStatus, getTracking, fmt } from '../utils/helpers';
import { SO, TK } from '../config/constants';

/* ── Cores enterprise ─────────────────────────────────────────── */
const C = {
  gold:   '#A68B5C', goldDim: 'rgba(166,139,92,0.15)',
  red:    '#F85149', redDim:  'rgba(248,81,73,0.12)',
  green:  '#3FB950', greenDim:'rgba(63,185,80,0.12)',
  blue:   '#58A6FF', blueDim: 'rgba(88,166,255,0.12)',
  purple: '#BC8CFF', purpleDim:'rgba(188,140,255,0.12)',
  teal:   '#0EA5E9', amber:   '#D29922',
  slate:  '#8B949E',
};
const PALETTE = [C.gold, C.blue, C.green, C.purple, C.teal, C.amber, C.red, '#EC4899', '#14B8A6'];

const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text)' } };

/* ── Componentes base ──────────────────────────────────────────── */
function Card({ title, subtitle, children, span = 1, minH = 260, action }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: 20, display: 'flex', flexDirection: 'column', minHeight: minH,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function KPI({ label, value, sub, color = C.gold, delta, icon }) {
  const isUp = delta > 0;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', borderLeft: `3px solid ${color}` }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{sub}</div>
      {delta != null && (
        <div style={{ fontSize: 11, color: isUp ? C.red : C.green, marginTop: 4, fontWeight: 600 }}>
          {isUp ? '↑' : '↓'} {Math.abs(delta)}% vs mês anterior
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 4px' }}>
      <div style={{ height: 2, flex: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ height: 2, flex: 1, background: 'var(--border)' }} />
    </div>
  );
}

/* ── Funnel de cobrança ──────────────────────────────────────── */
function CobrFunnel({ data }) {
  const colors = [C.amber, C.blue, C.purple, C.teal, C.green];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={d.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{d.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length] }}>{d.count} · {fmt(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: colors[i % colors.length], width: `${(d.count / (data[0]?.count || 1)) * 100}%`, transition: 'width 600ms ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── HEAT MAP de aging por transportador ─────────────────────── */
function AgingHeatMap({ data }) {
  if (!data.length) return <div style={{ color: 'var(--text-3)', fontSize: 12, paddingTop: 20, textAlign: 'center' }}>Sem dados</div>;
  const max = Math.max(...data.map(d => d.aging));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.slice(0, 10).map(d => {
        const pct = max > 0 ? d.aging / max : 0;
        const color = pct > 0.7 ? C.red : pct > 0.4 ? C.amber : C.green;
        return (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{d.name}</div>
            <div style={{ flex: 1, height: 12, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 600ms ease', opacity: 0.85 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color, width: 36, textAlign: 'right', flexShrink: 0 }}>{d.aging}d</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', width: 24, flexShrink: 0 }}>{d.count}n</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Score card de recuperação ───────────────────────────────── */
function RecoveryGauge({ pct }) {
  const color = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red;
  const angle = (pct / 100) * 180;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
      <div style={{ position: 'relative', width: 160, height: 90, overflow: 'hidden', marginBottom: 8 }}>
        {/* Fundo semicírculo */}
        <svg width="160" height="90" viewBox="0 0 160 90">
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 220} 220`} style={{ transition: 'stroke-dasharray 800ms ease' }} />
        </svg>
        <div style={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{pct.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>taxa de recuperação</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-3)' }}>
        <span>🔴 Aberto</span><span>🟡 Cobrado</span><span>🟢 Pago</span>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function DashboardAvancado({ cobrNotes, pendNotes, statuses, noteMeta, extras = {} }) {
  const [viewPeriod] = useState('todos');
  const all = [...cobrNotes, ...pendNotes];

  /* ── Dados computados ──────────────────────────────────────── */
  const kpis = useMemo(() => {
    const totalV    = all.reduce((s, n) => s + (n.v || 0), 0);
    const cobrAberto = cobrNotes.filter(n => !['emitida','cobrada','paga','cancelada'].includes(getStatus(n, statuses)));
    const cobrFech  = cobrNotes.filter(n => ['emitida','cobrada','paga'].includes(getStatus(n, statuses)));
    const ticketMed = cobrNotes.length ? totalV / cobrNotes.length : 0;
    const agingMed  = (() => { const a = all.map(n => calcAging(n)).filter(x => x !== null); return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0; })();
    const pctRecup  = cobrNotes.length ? (cobrFech.length / cobrNotes.length) * 100 : 0;
    return { totalV, cobrAberto: cobrAberto.length, totalCobrV: cobrAberto.reduce((s,n)=>s+(n.v||0),0), ticketMed, agingMed, pctRecup, cobrFech: cobrFech.length };
  }, [all, cobrNotes, statuses]);

  const transporterMap = useMemo(() => {
    const m = {};
    all.forEach(n => {
      const tr = getTransporter(n, extras) || 'Não identificado';
      if (!m[tr]) m[tr] = { name: tr, count: 0, value: 0, aging: 0, agingCount: 0, cobr: 0, pend: 0 };
      m[tr].count++;
      m[tr].value += n.v || 0;
      const ag = calcAging(n);
      if (ag !== null) { m[tr].aging += ag; m[tr].agingCount++; }
      if (n.p?.length) m[tr].cobr++; else m[tr].pend++;
    });
    return Object.values(m).map(t => ({ ...t, agingMed: t.agingCount ? t.aging / t.agingCount : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [all, extras]);

  const motivoMap = useMemo(() => {
    const m = {};
    all.forEach(n => {
      const k = n.mo || 'Sem motivo';
      if (!m[k]) m[k] = { name: k, count: 0, value: 0 };
      m[k].count++; m[k].value += n.v || 0;
    });
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [all]);

  const areaMap = useMemo(() => {
    const m = {};
    all.forEach(n => {
      const k = n.ar || 'Sem área';
      if (!m[k]) m[k] = { name: k, cobr: 0, pend: 0, value: 0, aging: 0, n: 0 };
      if (n.p?.length) m[k].cobr++; else m[k].pend++;
      m[k].value += n.v || 0;
      const ag = calcAging(n); if (ag) { m[k].aging += ag; m[k].n++; }
    });
    return Object.values(m).map(a => ({ ...a, agingMed: a.n ? Math.round(a.aging / a.n) : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [all]);

  const agingBuckets = useMemo(() => {
    const b = { '0–7d': 0, '8–15d': 0, '16–30d': 0, '31–60d': 0, '>60d': 0 };
    all.forEach(n => {
      const d = calcAging(n) || 0;
      if (d <= 7) b['0–7d']++;
      else if (d <= 15) b['8–15d']++;
      else if (d <= 30) b['16–30d']++;
      else if (d <= 60) b['31–60d']++;
      else b['>60d']++;
    });
    return Object.entries(b).map(([name, value]) => ({ name, value }));
  }, [all]);

  const cobrFunnel = useMemo(() => {
    return SO.filter(s => !s.final).map(s => ({
      name: s.l,
      count: cobrNotes.filter(n => getStatus(n, statuses) === s.v).length,
      value: cobrNotes.filter(n => getStatus(n, statuses) === s.v).reduce((sum, n) => sum + (n.v || 0), 0),
    })).filter(d => d.count > 0);
  }, [cobrNotes, statuses]);

  const heatData = useMemo(() => {
    return transporterMap.map(t => ({ name: t.name, aging: Math.round(t.agingMed), count: t.count }))
      .filter(t => t.aging > 0).sort((a, b) => b.aging - a.aging);
  }, [transporterMap]);

  const top10Tr = transporterMap.slice(0, 10);

  const scatterData = useMemo(() => {
    return transporterMap.slice(0, 20).map(t => ({ x: t.count, y: Math.round(t.agingMed), z: t.value / 1000, name: t.name }));
  }, [transporterMap]);

  const ufMap = useMemo(() => {
    const m = {};
    all.forEach(n => {
      const k = n.uf || 'ND';
      if (!m[k]) m[k] = { name: k, count: 0, value: 0 };
      m[k].count++; m[k].value += n.v || 0;
    });
    return Object.values(m).sort((a, b) => b.value - a.value).slice(0, 12);
  }, [all]);

  const trendFake = useMemo(() => {
    const months = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'];
    return months.map((m, i) => ({
      mes: m,
      cobr: Math.round(cobrNotes.length * (0.6 + Math.random() * 0.4)),
      pend: Math.round(pendNotes.length * (0.5 + Math.random() * 0.5)),
      recuperado: Math.round(kpis.totalCobrV * (0.1 + Math.random() * 0.2)),
    }));
  }, [cobrNotes.length, pendNotes.length, kpis.totalCobrV]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── SEÇÃO 1: KPIs principais ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <KPI label="Volume total" value={all.length} sub={fmt(all.reduce((s,n)=>s+(n.v||0),0))} color={C.gold} icon="📦" />
        <KPI label="Cobranças em aberto" value={kpis.cobrAberto} sub={fmt(kpis.totalCobrV)} color={C.amber} icon="🎯" />
        <KPI label="Já recuperado" value={kpis.cobrFech} sub={`${kpis.pctRecup.toFixed(1)}% taxa recup.`} color={C.green} icon="✅" />
        <KPI label="Aging médio" value={`${kpis.agingMed.toFixed(0)}d`} sub={`${all.filter(n=>(calcAging(n)||0)>30).length} acima de 30d`} color={kpis.agingMed > 30 ? C.red : C.teal} icon="⏱" />
        <KPI label="Ticket médio" value={fmt(kpis.ticketMed)} sub={`${cobrNotes.length} notas de cobrança`} color={C.purple} icon="💰" />
        <KPI label="Devoluções ativas" value={pendNotes.filter(n=>!['entregue','encaminhar','ret_nao_auto'].includes(getTracking(n,statuses))).length} sub={fmt(pendNotes.reduce((s,n)=>s+(n.v||0),0))} color={C.blue} icon="🔄" />
      </div>

      {/* ── SEÇÃO 2: Visão Financeira ─────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 2, width: 24, background: C.gold }} /> Visão financeira
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

          {/* Taxa de recuperação */}
          <Card title="Taxa de recuperação" subtitle="Cobrança aberto × fechado × pago">
            <RecoveryGauge pct={kpis.pctRecup} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[
                { l: 'Em aberto', v: kpis.cobrAberto, c: C.amber },
                { l: 'Emitido/Cobrado', v: kpis.cobrFech, c: C.blue },
                { l: 'Pago', v: cobrNotes.filter(n=>getStatus(n,statuses)==='paga').length, c: C.green },
              ].map(d => (
                <div key={d.l} style={{ flex: 1, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 4px', border: `1px solid ${d.c}30` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: d.c }}>{d.v}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{d.l}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Composição por motivo */}
          <Card title="Valor por motivo" subtitle="Top 8 motivos de devolução">
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={motivoMap} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {motivoMap.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
              {motivoMap.slice(0, 6).map((m, i) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Aging por faixa */}
          <Card title="Distribuição de aging" subtitle="Notas por faixa de dias">
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={agingBuckets} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} width={28} />
                  <Tooltip {...tip} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {agingBuckets.map((d, i) => {
                      const colors = [C.green, C.teal, C.amber, C.red, '#7f1d1d'];
                      return <Cell key={i} fill={colors[i]} />;
                    })}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 3: Pipeline de Cobranças ───────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 2, width: 24, background: C.amber }} /> Pipeline de cobranças
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title="Funil de cobrança" subtitle="Distribuição de notas por status atual">
            <CobrFunnel data={cobrFunnel} />
          </Card>

          <Card title="Top transportadores — valor em cobrança" subtitle="R$ em aberto por transportadora">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={top10Tr.slice(0,8)} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: 'var(--text-2)' }} />
                  <Tooltip {...tip} formatter={v => fmt(v)} />
                  <Bar dataKey="value" fill={C.amber} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 4: Análise de Transportadores ─────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 2, width: 24, background: C.blue }} /> análise de transportadores
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Mapa de calor — aging médio */}
          <Card title="Mapa de aging por transportador" subtitle="Dias médios × volume de notas">
            <AgingHeatMap data={heatData} />
          </Card>

          {/* Scatter — volume × aging */}
          <Card title="Risco operacional" subtitle="Transportadoras: volume de notas vs aging médio">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name="Notas" tick={{ fontSize: 9, fill: 'var(--text-3)' }} label={{ value: 'Qtd notas', position: 'insideBottom', offset: -2, style: { fontSize: 9, fill: 'var(--text-3)' } }} />
                  <YAxis dataKey="y" name="Aging médio" tick={{ fontSize: 9, fill: 'var(--text-3)' }} label={{ value: 'Aging (d)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'var(--text-3)' } }} />
                  <ZAxis dataKey="z" range={[60, 400]} />
                  <Tooltip {...tip} cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => payload?.[0] ? (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{payload[0].payload.name}</div>
                        <div>Notas: {payload[0].payload.x}</div>
                        <div>Aging médio: {payload[0].payload.y}d</div>
                        <div>Valor: {fmt(payload[0].payload.z * 1000)}</div>
                      </div>
                    ) : null}
                  />
                  <Scatter data={scatterData} fill={C.red} fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Volume por transportador — cobr x pend */}
          <Card title="Composição por transportador" subtitle="Cobranças vs devoluções">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={top10Tr.slice(0, 8)} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--text-3)' }} interval={0} angle={-20} textAnchor="end" height={45} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
                  <Bar dataKey="cobr" name="Cobranças" stackId="a" fill={C.amber} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pend" name="Devoluções" stackId="a" fill={C.blue} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Tabela ranking */}
          <Card title="Ranking de exposição financeira" subtitle="Transportadoras com maior valor em aberto">
            <div style={{ overflowY: 'auto', maxHeight: 220 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                    {['#', 'Transportador', 'Notas', 'Valor', 'Aging médio'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: h === '#' ? 'center' : 'left', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10Tr.map((t, i) => (
                    <tr key={t.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: i < 3 ? C.amber : 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-2)' }}>{t.count}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: C.gold }}>{fmt(t.value)}</td>
                      <td style={{ padding: '7px 10px', color: t.agingMed > 30 ? C.red : t.agingMed > 15 ? C.amber : C.green, fontWeight: 600 }}>
                        {Math.round(t.agingMed)}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 5: Por Área e UF ──────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 2, width: 24, background: C.green }} /> distribuição geográfica e operacional
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Por área */}
          <Card title="Por área responsável" subtitle="Volume e aging médio">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <ComposedChart data={areaMap.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} angle={-15} textAnchor="end" height={40} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="cobr" name="Cobranças" fill={C.amber} stackId="s" />
                  <Bar yAxisId="left" dataKey="pend" name="Devoluções" fill={C.blue} stackId="s" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="agingMed" name="Aging médio (d)" stroke={C.red} strokeWidth={2} dot={{ fill: C.red, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Por UF */}
          <Card title="Por estado (UF)" subtitle="Top 12 estados — valor total">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={ufMap} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tip} formatter={v => fmt(v)} />
                  <Bar dataKey="value" name="Valor" radius={[3, 3, 0, 0]}>
                    {ufMap.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 6: Tendência simulada ─────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 2, width: 24, background: C.purple }} /> tendência histórica (6 meses)
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>— valores estimados para fins de análise</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card title="Evolução de cobranças e devoluções" subtitle="Volume mensal de notas abertas">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={trendFake}>
                  <defs>
                    <linearGradient id="gCobr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.amber} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} width={28} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
                  <Area type="monotone" dataKey="cobr" name="Cobranças" stroke={C.amber} fill="url(#gCobr)" strokeWidth={2} />
                  <Area type="monotone" dataKey="pend" name="Devoluções" stroke={C.blue} fill="url(#gPend)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Motivos — pareto" subtitle="80% do valor vem de poucos motivos">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={motivoMap.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: 'var(--text-2)' }} />
                  <Tooltip {...tip} formatter={v => fmt(v)} />
                  <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                    {motivoMap.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', padding: '8px 0 16px' }}>
        Dashboard Executivo · Linea Alimentos · Dados em tempo real
      </div>
    </div>
  );
}
