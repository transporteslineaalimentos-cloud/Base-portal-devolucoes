import { fmt, isLancActive, getStatus } from '../utils/helpers';

const CardIcon = ({ children }) => (
  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </div>
);

export default function TransportDash({ myC = [], myP = [], statuses, onOpenTab, transporterName }) {
  const pAct = myP.filter(d => isLancActive(d, statuses));
  const cPend = myC.filter(d => getStatus(d, statuses) === 'cobr_tr');

  return (
    <div>
      <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: 'var(--gold)', fontWeight: 500 }}>
        Bem-vindo ao Portal do Transportador — <strong>{transporterName}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total de devoluções', value: myC.length + myP.length, sub: fmt(myC.reduce((s,d)=>s+d.v,0)+myP.reduce((s,d)=>s+d.v,0)), color: 'var(--gold)', tab: 'tr_retorno' },
          { label: 'Retornos pendentes', value: pAct.length, sub: fmt(pAct.reduce((s,d)=>s+d.v,0)), color: 'var(--yellow)', tab: 'tr_retorno' },
          { label: 'Cobranças aguardando posição', value: cPend.length, sub: fmt(cPend.reduce((s,d)=>s+d.v,0)), color: 'var(--red)', tab: 'tr_cobranca' },
        ].map(item => (
          <button key={item.label} onClick={() => onOpenTab(item.tab)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 180ms', borderLeft: `3px solid ${item.color}` }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = item.color; }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: item.color, lineHeight: 1, marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>Como usar este portal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { tab: 'tr_retorno', label: 'Devoluções', desc: 'Veja as devoluções pendentes de retorno. Informe se está em trânsito, agende a entrega ou notifique extravio.' },
            { tab: 'tr_cobranca', label: 'Cobranças', desc: 'Visualize as cobranças enviadas pela Linea Alimentos. Você pode aprovar, contestar ou informar não responsabilidade.' },
          ].map(item => (
            <button key={item.tab} onClick={() => onOpenTab(item.tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'background 120ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</div>
              </div>
              <span style={{ color: 'var(--gold)', fontSize: 16 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
