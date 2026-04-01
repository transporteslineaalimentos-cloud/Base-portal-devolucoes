import { useMemo } from 'react';
import { fmt, isLancActive, getStatus, calcAging } from '../utils/helpers';
import { TK, SO } from '../config/constants';

const URGENTE_AGING = 15;

function Avatar({ name, size = 40 }) {
  const ini = (name || '').trim().split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--gold-dim)', border: '2px solid rgba(166,139,92,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: 'var(--gold)', flexShrink: 0,
    }}>{ini}</div>
  );
}

function UrgBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{ background: '#F85149', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '2px 7px', marginLeft: 6 }}>{count}</span>
  );
}

export default function TransportDash({ myC = [], myP = [], statuses = {}, onOpenTab, onOpenNote, transporterName }) {
  const stats = useMemo(() => {
    const pAct    = myP.filter(d => isLancActive(d, statuses));
    const cPend   = myC.filter(d => getStatus(d, statuses) === 'cobr_tr');
    const urgP    = pAct.filter(d => (calcAging(d) || 0) >= URGENTE_AGING);
    const urgC    = cPend.filter(d => (calcAging(d) || 0) >= URGENTE_AGING);
    const totalV  = [...myC, ...myP].reduce((s,d) => s + (d.v||0), 0);
    return { pAct, cPend, urgP, urgC, totalV };
  }, [myC, myP, statuses]);

  const pendActions = useMemo(() => {
    const items = [];
    stats.cPend.forEach(n => {
      items.push({ type: 'cobr', note: n, aging: calcAging(n) || 0, label: 'Aguardando sua posição', color: '#D29922', icon: '📋' });
    });
    stats.pAct.forEach(n => {
      const st = getStatus(n, statuses) || '';
      const tk = TK.find(t => t.v === st);
      if (tk?.transp) items.push({ type: 'pend', note: n, aging: calcAging(n) || 0, label: tk.l, color: '#58A6FF', icon: '📦' });
    });
    return items.sort((a, b) => b.aging - a.aging).slice(0, 15);
  }, [stats, statuses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Boas-vindas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }}>
        <Avatar name={transporterName} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portal exclusivo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{transporterName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
        </div>
        {(stats.urgP.length + stats.urgC.length) > 0 && (
          <div style={{ background: '#F8514912', border: '1px solid #F8514930', borderRadius: 10, padding: '10px 16px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F85149' }}>{stats.urgP.length + stats.urgC.length}</div>
            <div style={{ fontSize: 10, color: '#F85149', fontWeight: 600 }}>itens urgentes</div>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {[
          { label: 'Devoluções ativas',   value: stats.pAct.length,  sub: fmt(stats.pAct.reduce((s,d)=>s+(d.v||0),0)),  color: '#58A6FF', tab: 'tr_retorno',  urg: stats.urgP.length },
          { label: 'Cobranças aguardando',value: stats.cPend.length,  sub: fmt(stats.cPend.reduce((s,d)=>s+(d.v||0),0)), color: '#D29922',  tab: 'tr_cobranca', urg: stats.urgC.length },
          { label: 'Total notas',          value: myC.length + myP.length, sub: fmt(stats.totalV), color: 'var(--gold)', tab: null, urg: 0 },
        ].map(item => (
          <button key={item.label}
            onClick={() => item.tab && onOpenTab(item.tab)}
            style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${item.color}`, borderRadius: 12, padding: '16px 18px', textAlign: 'left', cursor: item.tab ? 'pointer' : 'default', transition: 'all 160ms' }}
            onMouseEnter={e => item.tab && (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
              {item.urg > 0 && <UrgBadge count={item.urg} />}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: item.color, lineHeight: 1, marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.sub}</div>
            {item.tab && <div style={{ fontSize: 11, color: item.color, marginTop: 8, fontWeight: 500 }}>Ver detalhes →</div>}
          </button>
        ))}
      </div>

      {/* Ações pendentes — a lista de prioridade */}
      {pendActions.length > 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Ações que precisam da sua atenção</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ordenado por urgência — clique para atualizar</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{pendActions.length} item{pendActions.length !== 1 ? 's' : ''}</div>
          </div>
          <div>
            {pendActions.map((it, i) => {
              const aging = it.aging;
              const agingColor = aging >= 30 ? '#F85149' : aging >= 15 ? '#D29922' : '#3FB950';
              return (
                <button key={i} onClick={() => onOpenNote?.(it.note)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'transparent', border: 'none', borderBottom: i < pendActions.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Ícone */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${it.color}18`, border: `1px solid ${it.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {it.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>NFD {it.note.nfd}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {it.note.nfo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>{it.note.cl || 'Cliente'} · {fmt(it.note.v || 0)}</div>
                    <div style={{ fontSize: 11, color: it.color, fontWeight: 500 }}>{it.label}</div>
                  </div>

                  {/* Aging */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: agingColor }}>{aging}<span style={{ fontSize: 11 }}>d</span></div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>em aberto</div>
                  </div>

                  <span style={{ color: 'var(--text-3)', fontSize: 14 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Tudo em dia!</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Não há ações pendentes no momento.</div>
        </div>
      )}

      {/* Guia de uso */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>Como usar este portal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { tab: 'tr_retorno',  icon: '📦', color: '#58A6FF', label: 'Devoluções',  desc: 'Informe status de retorno, agende entrega ou notifique extravios. Atualize em tempo real para a equipe da Linea.' },
            { tab: 'tr_cobranca', icon: '📋', color: '#D29922',  label: 'Cobranças',   desc: 'Visualize cobranças abertas contra sua empresa. Aprove, conteste ou informe não responsabilidade com apenas um clique.' },
          ].map(item => (
            <button key={item.tab} onClick={() => onOpenTab(item.tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'background 120ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</div>
              </div>
              <span style={{ color: item.color, fontSize: 16, fontWeight: 700 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
