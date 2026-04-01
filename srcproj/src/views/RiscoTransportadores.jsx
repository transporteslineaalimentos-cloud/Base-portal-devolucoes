import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { fmt } from '../utils/helpers';

const NIVEL = {
  baixo:   { label: 'BAIXO',    color: '#3FB950', bg: 'rgba(63,185,80,.12)',   border: 'rgba(63,185,80,.3)'   },
  medio:   { label: 'MÉDIO',    color: '#D29922', bg: 'rgba(210,153,34,.12)',  border: 'rgba(210,153,34,.3)'  },
  alto:    { label: 'ALTO',     color: '#F0992B', bg: 'rgba(240,153,43,.12)',  border: 'rgba(240,153,43,.3)'  },
  critico: { label: 'CRÍTICO',  color: '#F85149', bg: 'rgba(248,81,73,.12)',   border: 'rgba(248,81,73,.3)'   },
};

const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text)' } };

function ScoreGauge({ score, nivel }) {
  const n = NIVEL[nivel] || NIVEL.baixo;
  const pct = Math.min(score, 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="90" height="52" viewBox="0 0 90 52">
        <path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke="var(--surface-3)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke={n.color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 116} 116`} style={{ transition: 'stroke-dasharray 800ms ease' }} />
      </svg>
      <div style={{ fontSize: 20, fontWeight: 800, color: n.color, marginTop: -8 }}>{score.toFixed(0)}</div>
      <div style={{ fontSize: 9, color: n.color, fontWeight: 700, letterSpacing: '0.08em' }}>{n.label}</div>
    </div>
  );
}

export default function RiscoTransportadores() {
  const [scores, setScores]     = useState([]);
  const [hist, setHist]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [sort, setSort]         = useState('score');

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Scores de hoje
      const { data: today } = await supabase
        .from('portal_risk_scores')
        .select('*')
        .eq('data', new Date().toISOString().split('T')[0])
        .order('score', { ascending: false });

      // Se não houver scores de hoje, pegar os mais recentes por transportador
      let rows = today || [];
      if (!rows.length) {
        const { data: recent } = await supabase
          .from('portal_risk_scores')
          .select('*')
          .order('data', { ascending: false })
          .limit(50);
        // Pegar o mais recente de cada transportador
        const seen = new Set();
        rows = (recent || []).filter(r => { if (seen.has(r.transportador)) return false; seen.add(r.transportador); return true; });
      }
      setScores(rows);

      // Histórico dos últimos 30 dias (todos os transportadores)
      const { data: history } = await supabase
        .from('portal_risk_scores')
        .select('transportador, data, score, nivel')
        .gte('data', new Date(Date.now() - 30*86400000).toISOString().split('T')[0])
        .order('data');
      setHist(history || []);
      setLoading(false);
    }
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...scores].sort((a, b) => sort === 'score' ? b.score - a.score : (sort === 'aging' ? b.aging_med - a.aging_med : b.valor_total - a.valor_total));
  }, [scores, sort]);

  // Contagem por nível
  const counts = useMemo(() => {
    const c = { critico: 0, alto: 0, medio: 0, baixo: 0 };
    scores.forEach(s => { c[s.nivel] = (c[s.nivel] || 0) + 1; });
    return c;
  }, [scores]);

  // Tendência do score médio geral por dia
  const trendGeral = useMemo(() => {
    const byDate = {};
    hist.forEach(h => {
      if (!byDate[h.data]) byDate[h.data] = [];
      byDate[h.data].push(h.score);
    });
    return Object.entries(byDate).map(([data, vals]) => ({
      data: new Date(data).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }),
      score: Math.round(vals.reduce((s,v)=>s+v,0)/vals.length),
    })).slice(-15);
  }, [hist]);

  const sel = selected ? scores.find(s => s.transportador === selected) : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-3)', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13 }}>Calculando scores de risco…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!scores.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum score calculado ainda</div>
      <div style={{ fontSize: 12, marginTop: 8 }}>O cálculo roda automaticamente todo dia às 9:30h.<br/>Você pode acionar manualmente via Integração Protheus.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Resumo por nível */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {Object.entries(NIVEL).reverse().map(([key, n]) => (
          <div key={key} style={{ background: n.bg, border: `1px solid ${n.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: n.color }}>{counts[key] || 0}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: n.color, letterSpacing: '0.08em' }}>{n.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>transportadora{(counts[key]||0) !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Alertas críticos */}
      {counts.critico > 0 && (
        <div style={{ background: 'rgba(248,81,73,.08)', border: '1px solid rgba(248,81,73,.3)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F85149', marginBottom: 10 }}>🚨 Transportadoras em nível CRÍTICO — atenção imediata necessária</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.filter(s => s.nivel === 'critico').map(s => (
              <div key={s.transportador} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(248,81,73,.06)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setSelected(s.transportador === selected ? null : s.transportador)}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#F85149', minWidth: 36 }}>{s.score.toFixed(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{s.transportador}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.notas_total} notas · aging {s.aging_med}d · {s.pct_exp30}% expiradas</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F85149' }}>{fmt(s.valor_total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Ranking score */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Score de risco por transportadora</div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="input" style={{ width: 'auto', fontSize: 11, padding: '4px 8px', height: 28 }}>
              <option value="score">Por score</option>
              <option value="aging">Por aging</option>
              <option value="valor">Por valor</option>
            </select>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {sorted.map((s, i) => {
              const n = NIVEL[s.nivel] || NIVEL.baixo;
              return (
                <div key={s.transportador} onClick={() => setSelected(s.transportador === selected ? null : s.transportador)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected === s.transportador ? n.bg : 'transparent', transition: 'background 120ms' }}
                  onMouseEnter={e => { if (selected !== s.transportador) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (selected !== s.transportador) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: i < 3 ? n.color : 'var(--text-3)', width: 20, textAlign: 'center' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.transportador}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.notas_total} notas · {s.aging_med}d aging · {s.pct_exp30}% exp.</div>
                  </div>
                  {/* Mini barra de score */}
                  <div style={{ width: 60, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.score}%`, background: n.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: n.color, width: 32, textAlign: 'right' }}>{s.score.toFixed(0)}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: n.color, background: n.bg, padding: '2px 6px', borderRadius: 4, border: `1px solid ${n.border}`, whiteSpace: 'nowrap' }}>{n.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhe da transportadora selecionada ou gráfico de barras geral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sel ? (
            <div style={{ background: 'var(--surface)', border: `1px solid ${NIVEL[sel.nivel]?.border || 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Detalhamento de risco</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sel.transportador}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <ScoreGauge score={sel.score} nivel={sel.nivel} />
                </div>
              </div>

              {/* Breakdown do score */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Composição do score</div>
                {[
                  { label: 'Aging médio', pts: sel.detalhes?.s_aging || 0, max: 40, val: `${sel.aging_med}d`, desc: 'Peso: 40pts (máx em 60d)' },
                  { label: 'Exposição >30d', pts: sel.detalhes?.s_exp || 0, max: 35, val: `${sel.pct_exp30}%`, desc: 'Peso: 35pts' },
                  { label: 'Valor em carteira', pts: sel.detalhes?.s_valor || 0, max: 25, val: fmt(sel.valor_total), desc: 'Peso: 25pts (relativo ao maior)' },
                ].map(d => (
                  <div key={d.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{d.label} <span style={{ color: 'var(--text-3)', fontSize: 10 }}>({d.val})</span></span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{d.pts.toFixed(1)} / {d.max} pts</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: NIVEL[sel.nivel]?.color, width: `${(d.pts / d.max) * 100}%`, transition: 'width 600ms ease' }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{d.desc}</div>
                  </div>
                ))}
              </div>

              {/* Métricas resumidas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { l: 'Notas', v: sel.notas_total },
                  { l: 'Aging méd.', v: `${sel.aging_med}d` },
                  { l: 'Exp. >30d', v: `${sel.pct_exp30}%` },
                ].map(m => (
                  <div key={m.l} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{m.v}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{m.l}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => setSelected(null)} style={{ marginTop: 12, width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px', fontSize: 11, color: 'var(--text-3)', cursor: 'pointer' }}>
                Fechar detalhe
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Score top 8 — comparativo</div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={sorted.slice(0,8)} layout="vertical" barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0,100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                    <YAxis type="category" dataKey="transportador" width={130} tick={{ fontSize: 9, fill: 'var(--text-2)' }} />
                    <Tooltip {...tip} formatter={v => [`${v.toFixed(1)} pts`, 'Score']} />
                    <Bar dataKey="score" radius={[0,4,4,0]}>
                      {sorted.slice(0,8).map(s => (
                        <Cell key={s.transportador} fill={NIVEL[s.nivel]?.color || '#8B949E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>Clique em uma transportadora à esquerda para ver o detalhamento</div>
            </div>
          )}

          {/* Tendência do score médio */}
          {trendGeral.length > 1 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Evolução do score médio geral</div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer>
                  <LineChart data={trendGeral}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                    <YAxis domain={[0,100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} width={24} />
                    <Tooltip {...tip} formatter={v => [`${v} pts`, 'Score médio']} />
                    <Line type="monotone" dataKey="score" stroke="#F85149" strokeWidth={2} dot={{ fill: '#F85149', r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metodologia */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Como o score é calculado</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-3)' }}>
          <span>🕐 <strong>Aging médio</strong> — 40 pontos. Máximo em 60 dias de aging médio.</span>
          <span>📋 <strong>Exposição +30d</strong> — 35 pontos. % de notas acima de 30 dias.</span>
          <span>💰 <strong>Valor em carteira</strong> — 25 pontos. Proporcional ao maior valor entre todas as transportadoras.</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 10 }}>
          {Object.entries(NIVEL).map(([,n]) => (
            <span key={n.label} style={{ color: n.color, fontWeight: 600 }}>● {n.label} (0-{n.label==='BAIXO'?'30':n.label==='MÉDIO'?'55':n.label==='ALTO'?'75':'100'})</span>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>Atualizado automaticamente todo dia às 9:30h via Edge Function.</div>
      </div>
    </div>
  );
}
