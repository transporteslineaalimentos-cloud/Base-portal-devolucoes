import { TK } from '../config/constants';

// Ordem visual das etapas no pipeline
const PIPELINE = [
  'aguardando',
  'notificado',
  'retorno_auto',
  'em_transito',
  'agendado',
  'entregue',
];

const TERMINAL = ['ret_nao_auto', 'encaminhar', 'dev_recusada', 'dev_apos_dt', 'extravio', 'perdeu_agenda'];

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function stepIndex(v) {
  const i = PIPELINE.indexOf(v);
  return i === -1 ? (v === 'entregue' ? PIPELINE.length - 1 : -1) : i;
}

export default function TrackingStepper({ current }) {
  const isTerminal = TERMINAL.includes(current);
  const currentIdx = stepIndex(current);

  if (isTerminal) {
    const tkObj = TK.find(t => t.v === current);
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)',
        borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--red)', fontWeight: 600
      }}>
        {tkObj?.i} {tkObj?.l || current}
      </div>
    );
  }

  return (
    <div className="stepper">
      {PIPELINE.map((step, idx) => {
        const tkObj = TK.find(t => t.v === step);
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const cls = `step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`;

        return (
          <div key={step} className={cls}>
            <div className="step-dot">
              {isDone ? <CheckIcon /> : <span>{idx + 1}</span>}
            </div>
            <div className="step-label">
              {tkObj?.l?.replace('Para o ', '').replace(' autorizado', '') || step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
