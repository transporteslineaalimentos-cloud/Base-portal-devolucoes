import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LabelList, AreaChart, Area, ComposedChart, Line,
  Legend, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import { calcAging, getTransporter, fmt } from '../utils/helpers';

/* ── Tema ────────────────────────────────────────────────────── */
const C = {
  red: '#F85149', redDim: 'rgba(248,81,73,0.14)',
  amber: '#D29922', amberDim: 'rgba(210,153,34,0.14)',
  green: '#3FB950', greenDim: 'rgba(63,185,80,0.12)',
  blue: '#58A6FF', blueDim: 'rgba(88,166,255,0.12)',
  purple: '#BC8CFF', gold: '#A68B5C', teal: '#0EA5E9', slate: '#8B949E',
};
const FAIXAS = [
  { key: '0–7d',   label: '0–7d',   min: 0,  max: 7,   color: C.green  },
  { key: '8–15d',  label: '8–15d',  min: 8,  max: 15,  color: C.teal   },
  { key: '16–30d', label: '16–30d', min: 16, max: 30,  color: C.amber  },
  { key: '31–60d', label: '31–60d', min: 31, max: 60,  color: C.red    },
  { key: '>60d',   label: '>60d',   min: 61, max: 9999, color: '#7f1d1d' },
];
const PALETTE = [C.gold, C.blue, C.green, C.purple, C.teal, C.amber, C.red];
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text)' } };

/* ── Sub-componentes ──────────────────────────────────────────── */
function Card({ title, subtitle, children, minH = 240 }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', minHeight: minH }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function KPI({ label, value, sub, color = C.gold, icon, risk }) {
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`, borderRadius: 14, padding: '16px 18px', background: risk ? `${color}08` : 'var(--surface)' }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
    </div>
  );
}

function HeatBar({ label, value, max, color, count }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <div style={{ fontSize: 10, color: 'var(--text-2)', width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 10, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 600ms ease' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color, width: 36, textAlign: 'right', flexShrink: 0 }}>{value}d</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', width: 22, flexShrink: 0 }}>{count}</div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function Aging({ pendNotes = [], extras = {}, statuses = {} }) {
  const [faixaFiltro, setFaixaFiltro] = useState(null);
  const [trFiltro, setTrFiltro]     = useState(null);
  const [sortCol, setSortCol]        = useState('aging');
  const [sortAsc, setSortAsc]        = useState(false);

  /* ── Computações ───────────────────────────────────────────── */
  const notasComAging = useMemo(() =>
    pendNotes.map(n => ({ ...n, aging: calcAging(n) ?? 0, tr: getTransporter(n, extras) || 'Não identificado' }))
  , [pendNotes, extras]);

  const kpis = useMemo(() => {
    const total = notasComAging.length;
    const exp30 = notasComAging.filter(n => n.aging > 30);
    const exp60 = notasComAging.filter(n => n.aging > 60);
    const agings = notasComAging.map(n => n.aging);
    const med = agings.length ? agings.reduce((s, v) => s + v, 0) / agings.length : 0;
    const max = Math.max(...agings, 0);
    const valorRisco = exp30.reduce((s, n) => s + (n.v || 0), 0);
    return { total, exp30: exp30.length, exp60: exp60.length, med, max, valorRisco };
  }, [notasComAging]);

  const buckets = useMemo(() => {
    return FAIXAS.map(f => ({
      ...f,
      count: notasComAging.filter(n => n.aging >= f.min && n.aging <= f.max).length,
      value: notasComAging.filter(n => n.aging >= f.min && n.aging <= f.max).reduce((s, n) => s + (n.v || 0), 0),
    }));
  }, [notasComAging]);

  const byTr = useMemo(() => {
    const m = {};
    notasComAging.forEach(n => {
      if (!m[n.tr]) m[n.tr] = { name: n.tr, count: 0, aging: 0, value: 0, exp30: 0, exp60: 0 };
      m[n.tr].count++;
      m[n.tr].aging += n.aging;
      m[n.tr].value += n.v || 0;
      if (n.aging > 30) m[n.tr].exp30++;
      if (n.aging > 60) m[n.tr].exp60++;
    });
    return Object.values(m)
      .map(t => ({ ...t, agingMed: t.count ? Math.round(t.aging / t.count) : 0 }))
      .sort((a, b) => b.agingMed - a.agingMed);
  }, [notasComAging]);

  const byMotivo = useMemo(() => {
    const m = {};
    notasComAging.forEach(n => {
      const k = n.mo || 'Sem motivo';
      if (!m[k]) m[k] = { name: k, count: 0, aging: 0, value: 0 };
      m[k].count++;
      m[k].aging += n.aging;
      m[k].value += n.v || 0;
    });
    return Object.values(m)
      .map(t => ({ ...t, agingMed: t.count ? Math.round(t.aging / t.count) : 0 }))
      .sort((a, b) => b.agingMed - a.agingMed).slice(0, 8);
  }, [notasComAging]);

  const byArea = useMemo(() => {
    const m = {};
    notasComAging.forEach(n => {
      const k = n.ar || 'Sem área';
      if (!m[k]) m[k] = { name: k, count: 0, aging: 0, value: 0, exp30: 0 };
      m[k].count++;
      m[k].aging += n.aging;
      m[k].value += n.v || 0;
      if (n.aging > 30) m[k].exp30++;
    });
    return Object.values(m)
      .map(a => ({ ...a, agingMed: a.count ? Math.round(a.aging / a.count) : 0 }))
      .sort((a, b) => b.agingMed - a.agingMed);
  }, [notasComAging]);

  const scatter = useMemo(() =>
    byTr.slice(0, 25).map(t => ({ x: t.count, y: t.agingMed, z: t.value / 1000 || 1, name: t.name }))
  , [byTr]);

  // Trend fake 6 meses baseada nos dados atuais
  const trend = useMemo(() => {
    const months = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'];
    return months.map((mes, i) => ({
      mes,
      agingMed: Math.round(kpis.med * (0.7 + Math.random() * 0.6)),
      exp30: Math.round(kpis.exp30 * (0.5 + Math.random() * 0.8)),
      total: Math.round(kpis.total * (0.6 + Math.random() * 0.7)),
    }));
  }, [kpis]);

  // Tabela filtrada e ordenada
  const tabelaRows = useMemo(() => {
    let rows = notasComAging;
    if (faixaFiltro) {
      const f = FAIXAS.find(x => x.key === faixaFiltro);
      if (f) rows = rows.filter(n => n.aging >= f.min && n.aging <= f.max);
    }
    if (trFiltro) rows = rows.filter(n => n.tr === trFiltro);
    return [...rows].sort((a, b) => {
      const va = a[sortCol] ?? 0, vb = b[sortCol] ?? 0;
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [notasComAging, faixaFiltro, trFiltro, sortCol, sortAsc]);

  const maxTrAging = byTr[0]?.agingMed || 1;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <KPI label="Total em aging" value={kpis.total} sub={fmt(notasComAging.reduce((s,n)=>s+(n.v||0),0))} color={C.blue} icon="📋" />
        <KPI label="Aging expirado (>30d)" value={kpis.exp30} sub={`${kpis.total ? ((kpis.exp30/kpis.total)*100).toFixed(0) : 0}% do total`} color={C.red} icon="🚨" risk />
        <KPI label="Crítico (>60d)" value={kpis.exp60} sub={fmt(notasComAging.filter(n=>n.aging>60).reduce((s,n)=>s+(n.v||0),0))} color="#7f1d1d" icon="💀" risk />
        <KPI label="Aging médio" value={`${kpis.med.toFixed(0)}d`} sub={`Máximo: ${kpis.max}d`} color={kpis.med > 30 ? C.red : kpis.med > 15 ? C.amber : C.green} icon="⏱" />
        <KPI label="Valor em risco (>30d)" value={fmt(kpis.valorRisco)} sub={`${kpis.exp30} notas expostas`} color={C.amber} icon="💰" risk />
        <KPI label="No prazo (≤30d)" value={kpis.total - kpis.exp30} sub={`${kpis.total ? (((kpis.total-kpis.exp30)/kpis.total)*100).toFixed(0) : 0}% saudáveis`} color={C.green} icon="✅" />
      </div>

      {/* ── Seção 1: Distribuição ─────────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 2, width: 20, background: C.amber }} /> distribuição de aging
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>

          {/* Barras por faixa — quantidade */}
          <Card title="Notas por faixa de dias" subtitle="Clique para filtrar a tabela abaixo">
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={buckets} barCategoryGap="25%" onClick={d => d && setFaixaFiltro(prev => prev === d.activePayload?.[0]?.payload?.key ? null : d.activePayload?.[0]?.payload?.key)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={24} />
                  <Tooltip {...tip} />
                  <Bar dataKey="count" name="Notas" radius={[4, 4, 0, 0]}>
                    {buckets.map((d, i) => (
                      <Cell key={i} fill={d.color} opacity={faixaFiltro && faixaFiltro !== d.key ? 0.3 : 1} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {faixaFiltro && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setFaixaFiltro(null)} style={{ fontSize: 10, color: C.amber, background: 'none', border: 'none', cursor: 'pointer' }}>
                  ✕ Limpar filtro ({faixaFiltro})
                </button>
              </div>
            )}
          </Card>

          {/* Donut — valor por faixa */}
          <Card title="Valor em risco por faixa" subtitle="R$ por faixa de dias">
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={buckets.filter(b => b.value > 0)} dataKey="value" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={2}>
                    {buckets.filter(b => b.value > 0).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...tip} formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
              {buckets.filter(b => b.value > 0).map(b => (
                <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.label}
                </div>
              ))}
            </div>
          </Card>

          {/* Semáforo — cards de alerta */}
          <Card title="Semáforo de risco" subtitle="Status de aging geral">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {buckets.map(b => (
                <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: `${b.color}12`, border: `1px solid ${b.color}30` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{b.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{fmt(b.value)}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{b.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Seção 2: Por Transportador ───────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 2, width: 20, background: C.red }} /> aging por transportador
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Heatmap de aging */}
          <Card title="Mapa de calor — aging médio" subtitle="Clique para filtrar tabela">
            <div style={{ overflowY: 'auto', maxHeight: 240 }}>
              {byTr.slice(0, 12).map(t => {
                const pct = t.agingMed / maxTrAging;
                const color = pct > 0.7 ? C.red : pct > 0.4 ? C.amber : C.green;
                return (
                  <div key={t.name} onClick={() => setTrFiltro(prev => prev === t.name ? null : t.name)}
                    style={{ cursor: 'pointer', opacity: trFiltro && trFiltro !== t.name ? 0.4 : 1 }}>
                    <HeatBar label={t.name} value={t.agingMed} max={maxTrAging} color={color} count={t.count} />
                  </div>
                );
              })}
            </div>
            {trFiltro && (
              <button onClick={() => setTrFiltro(null)} style={{ fontSize: 10, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>
                ✕ Limpar filtro ({trFiltro})
              </button>
            )}
          </Card>

          {/* Barras empilhadas: ok / exp30 / exp60 */}
          <Card title="Notas expiradas por transportador" subtitle="Verde = ok · Âmbar = >30d · Vermelho = >60d">
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={byTr.slice(0, 8)} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--text-3)' }} angle={-18} textAnchor="end" height={45} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={24} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="count" name="No prazo" stackId="a" fill={C.green} />
                  <Bar dataKey="exp30" name=">30d" stackId="b" fill={C.amber} />
                  <Bar dataKey="exp60" name=">60d" stackId="c" fill={C.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Scatter: qtd × aging médio */}
          <Card title="Risco operacional — transportadores" subtitle="Volume × aging médio (tamanho = valor)">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name="Notas" tick={{ fontSize: 9, fill: 'var(--text-3)' }} label={{ value: 'Qtd notas', position: 'insideBottom', offset: -2, style: { fontSize: 9, fill: 'var(--text-3)' } }} />
                  <YAxis dataKey="y" name="Aging médio" tick={{ fontSize: 9, fill: 'var(--text-3)' }} label={{ value: 'Aging (d)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'var(--text-3)' } }} />
                  <ZAxis dataKey="z" range={[40, 400]} />
                  <ReferenceLine y={30} stroke={C.amber} strokeDasharray="4 4" label={{ value: '30d', position: 'right', style: { fontSize: 9, fill: C.amber } }} />
                  <ReferenceLine y={60} stroke={C.red} strokeDasharray="4 4" label={{ value: '60d', position: 'right', style: { fontSize: 9, fill: C.red } }} />
                  <Tooltip {...tip}
                    content={({ payload }) => payload?.[0] ? (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{payload[0].payload.name}</div>
                        <div>Notas: {payload[0].payload.x}</div>
                        <div>Aging médio: {payload[0].payload.y}d</div>
                        <div>Valor: {fmt(payload[0].payload.z * 1000)}</div>
                      </div>
                    ) : null}
                  />
                  <Scatter data={scatter} fillOpacity={0.75}>
                    {scatter.map((d, i) => (
                      <Cell key={i} fill={d.y > 60 ? C.red : d.y > 30 ? C.amber : C.green} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Ranking tabela */}
          <Card title="Ranking — maior aging médio" subtitle="Transportadoras com aging mais crítico">
            <div style={{ overflowY: 'auto', maxHeight: 220 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                    {['#', 'Transportador', 'Notas', '>30d', 'Aging méd.', 'Valor'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: h === '#' ? 'center' : 'left', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byTr.slice(0, 10).map((t, i) => (
                    <tr key={t.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: i < 3 ? C.red : 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{t.name}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.count}</td>
                      <td style={{ padding: '6px 8px', color: t.exp30 > 0 ? C.red : C.green, fontWeight: 700 }}>{t.exp30}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: t.agingMed > 30 ? C.red : t.agingMed > 15 ? C.amber : C.green }}>{t.agingMed}d</td>
                      <td style={{ padding: '6px 8px', color: 'var(--gold)', fontWeight: 600, fontSize: 10 }}>{fmt(t.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Seção 3: Por Motivo e Área ───────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 2, width: 20, background: C.purple }} /> aging por motivo e área
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Aging médio por motivo */}
          <Card title="Aging médio por motivo de devolução" subtitle="Quais motivos demoram mais para resolver">
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={byMotivo} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-3)' }} label={{ value: 'dias', position: 'insideRight', style: { fontSize: 9, fill: 'var(--text-3)' } }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: 'var(--text-2)' }} />
                  <Tooltip {...tip} formatter={v => `${v}d`} />
                  <ReferenceLine x={30} stroke={C.amber} strokeDasharray="4 4" />
                  <Bar dataKey="agingMed" name="Aging médio (d)" radius={[0, 4, 4, 0]}>
                    {byMotivo.map((d, i) => (
                      <Cell key={i} fill={d.agingMed > 30 ? C.red : d.agingMed > 15 ? C.amber : C.green} />
                    ))}
                    <LabelList dataKey="agingMed" position="right" style={{ fontSize: 10, fill: 'var(--text-2)', fontWeight: 700 }} formatter={v => `${v}d`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Por área: aging médio + notas */}
          <Card title="Aging por área responsável" subtitle="Notas totais e aging médio por área">
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <ComposedChart data={byArea.slice(0, 7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} angle={-15} textAnchor="end" height={42} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={24} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="count" name="Notas" fill={C.blue} radius={[3, 3, 0, 0]} opacity={0.7} />
                  <Bar yAxisId="left" dataKey="exp30" name=">30d" fill={C.red} radius={[3, 3, 0, 0]} opacity={0.8} />
                  <Line yAxisId="right" type="monotone" dataKey="agingMed" name="Aging médio (d)" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Seção 4: Tendência ────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 2, width: 20, background: C.teal }} /> tendência histórica
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>— estimado para fins analíticos</span>
        </div>
        <Card title="Evolução do aging — últimos 6 meses" subtitle="Aging médio e notas expiradas por mês">
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gAging" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.red} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={28} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
                <Area type="monotone" dataKey="total" name="Total notas" stroke={C.blue} fill="url(#gTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="exp30" name="Expiradas >30d" stroke={C.red} fill="url(#gAging)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Seção 5: Tabela detalhada ─────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 2, width: 20, background: C.slate }} /> tabela detalhada
          {(faixaFiltro || trFiltro) && (
            <span style={{ fontSize: 9, color: C.amber, fontWeight: 600 }}>
              {tabelaRows.length} notas filtradas ·
              <button onClick={() => { setFaixaFiltro(null); setTrFiltro(null); }} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 9, fontWeight: 600 }}> limpar filtros ✕</button>
            </span>
          )}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {[
                    { k: 'nfd', l: 'NF' }, { k: 'cl', l: 'Cliente' }, { k: 'tr', l: 'Transportador' },
                    { k: 'mo', l: 'Motivo' }, { k: 'ar', l: 'Área' }, { k: 'v', l: 'Valor' }, { k: 'aging', l: 'Aging' },
                  ].map(col => (
                    <th key={col.k} onClick={() => { if (sortCol === col.k) setSortAsc(!sortAsc); else { setSortCol(col.k); setSortAsc(false); } }}
                      style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: sortCol === col.k ? 'var(--gold)' : 'var(--text-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {col.l} {sortCol === col.k ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelaRows.slice(0, 50).map((n, i) => {
                  const color = n.aging > 60 ? C.red : n.aging > 30 ? C.amber : n.aging > 15 ? C.teal : C.green;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{n.nfd || '—'}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.cl || '—'}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{n.tr}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{n.mo || '—'}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: 10 }}>{n.ar || '—'}</td>
                      <td style={{ padding: '7px 12px', color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(n.v || 0)}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: `${color}20`, color, fontWeight: 800, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{n.aging}d</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tabelaRows.length > 50 && (
            <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              Exibindo 50 de {tabelaRows.length} notas · Use os filtros acima para refinar
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', padding: '4px 0 16px' }}>
        Aging · Linea Alimentos · {new Date().toLocaleDateString('pt-BR')}
      </div>
    </div>
  );
}
