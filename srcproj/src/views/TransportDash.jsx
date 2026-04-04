import { useMemo } from 'react';
import { fmt, getStatus, getTracking, calcAging, getNoteKey } from '../utils/helpers';
import { TK, SO } from '../config/constants';

function KPI({ label, value, sub, color = 'var(--gold)', icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className="stat-card"
      style={{ borderLeftColor: color, cursor: onClick ? 'pointer' : 'default' }}
    >
      {icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: 'var(--text)', fontSize: 24 }}>{value}</div>
      {sub && <div className="kpi-sub" style={{ color, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ icon, label, count, color, onClick }) {
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '14px 16px', border: `1px solid ${color}25`,
        borderRadius: 12, background: `${color}06`, cursor: 'pointer',
        textAlign: 'left', transition: 'all 120ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}12`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}06`}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
          {count} nota{count !== 1 ? 's' : ''} aguardando
        </div>
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color,
        padding: '4px 12px', background: `${color}12`,
        borderRadius: 10, minWidth: 36, textAlign: 'center',
      }}>{count}</div>
      <span style={{ color: 'var(--text-3)', fontSize: 18 }}>›</span>
    </button>
  );
}

function RecentNote({ note, status, color }) {
  const aging = calcAging(note) || 0;
  const ac = aging >= 30 ? '#F85149' : aging >= 20 ? '#D29922' : '#3FB950';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${ac}12`, border: `1px solid ${ac}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: ac,
      }}>{aging}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
            NF {note.nfd || '—'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{note.nfo}</span>
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-2)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{note.cl || 'Cliente'}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, color, padding: '2px 8px',
        background: `${color}12`, borderRadius: 5, whiteSpace: 'nowrap',
      }}>{status}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{fmt(note.v || 0)}</span>
    </div>
  );
}

export default function TransportDash({
  myC = [], myP = [], statuses = {}, transporterName,
  extras = {}, onChangeTab,
}) {
  const getT = (n) => getTracking(n, statuses) || '';
  const getS = (n) => getStatus(n, statuses) || '';
  const FINAL_TK = ['entregue', 'encaminhar', 'ret_nao_auto', 'extravio'];

  const stats = useMemo(() => {
    const pend_cobr = myC.filter(n => getS(n) === 'cobr_tr').length;
    const pend_devol = myP.filter(n => ['retorno_auto', 'perdeu_agenda'].includes(getT(n))).length;
    const andamento = myP.filter(n => ['ag_consolidacao', 'em_transito', 'recebida_filial', 'agend_solicitado'].includes(getT(n))).length;
    const entregas = myP.filter(n => ['agend_confirmado', 'agendado'].includes(getT(n))).length;
    const alertas = myP.filter(n => !FINAL_TK.includes(getT(n)) && (calcAging(n) || 0) >= 20).length;
    const ativas = myP.filter(n => !FINAL_TK.includes(getT(n))).length;
    const finalizadas = myP.filter(n => getT(n) === 'entregue').length;
    const totalValor = [...myC, ...myP].reduce((s, n) => s + (n.v || 0), 0);
    const agings = myP.map(n => calcAging(n)).filter(x => x !== null);
    const agingMed = agings.length ? Math.round(agings.reduce((s, v) => s + v, 0) / agings.length) : 0;

    return { pend_cobr, pend_devol, andamento, entregas, alertas, ativas, finalizadas, totalValor, agingMed, urgente: pend_cobr + pend_devol };
  }, [myC, myP, statuses]);

  const recentDevol = useMemo(() =>
    myP.filter(n => !FINAL_TK.includes(getT(n)))
      .sort((a, b) => (calcAging(b) || 0) - (calcAging(a) || 0))
      .slice(0, 5)
  , [myP, statuses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header com nome */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'var(--gold-dim)', border: '2px solid rgba(166,139,92,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'var(--gold)',
        }}>
          {(transporterName || '?').trim().split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Portal do transportador
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{transporterName}</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <KPI label="Ações urgentes" value={stats.urgente} sub="Precisam da sua resposta" color={stats.urgente > 0 ? '#F85149' : '#3FB950'} icon="🔔"
          onClick={stats.urgente > 0 ? () => onChangeTab?.('tr_pendentes') : undefined} />
        <KPI label="Em andamento" value={stats.andamento} sub="Retorno em progresso" color="#58A6FF" icon="🔄"
          onClick={stats.andamento > 0 ? () => onChangeTab?.('tr_andamento') : undefined} />
        <KPI label="Entregas pendentes" value={stats.entregas} sub="Marcar como entregue" color="#0d9488" icon="📦"
          onClick={stats.entregas > 0 ? () => onChangeTab?.('tr_entregas') : undefined} />
        <KPI label="Cobranças" value={myC.length} sub={fmt(myC.reduce((s, n) => s + (n.v || 0), 0))} color="#D29922" icon="💰"
          onClick={myC.length > 0 ? () => onChangeTab?.('tr_cobrancas') : undefined} />
        <KPI label="Aging médio" value={`${stats.agingMed}d`} sub={`${stats.alertas} acima de 20d`}
          color={stats.agingMed > 30 ? '#F85149' : stats.agingMed > 15 ? '#D29922' : '#3FB950'} icon="⏱" />
        <KPI label="Finalizadas" value={stats.finalizadas} sub="Entregues com sucesso" color="#3FB950" icon="✅" />
      </div>

      {/* Ações rápidas */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Ações rápidas
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <QuickAction icon="🔴" label="Devoluções aguardando sua ação" count={stats.pend_devol} color="#F85149"
            onClick={() => onChangeTab?.('tr_pendentes')} />
          <QuickAction icon="🟡" label="Cobranças aguardando sua posição" count={stats.pend_cobr} color="#D29922"
            onClick={() => onChangeTab?.('tr_cobrancas')} />
          <QuickAction icon="🔵" label="Notas para atualizar status" count={stats.andamento} color="#58A6FF"
            onClick={() => onChangeTab?.('tr_andamento')} />
          <QuickAction icon="🟢" label="Agendamentos prontos para entrega" count={stats.entregas} color="#0d9488"
            onClick={() => onChangeTab?.('tr_entregas')} />
        </div>
      </div>

      {/* Notas mais antigas */}
      {recentDevol.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Notas com maior aging
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {recentDevol.map((n, i) => {
              const tkObj = TK.find(t => t.v === getT(n));
              return <RecentNote key={i} note={n} status={tkObj?.l || getT(n)} color={tkObj?.c || 'var(--text-3)'} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
