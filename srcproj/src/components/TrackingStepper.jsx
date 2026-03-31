import { TK } from '../config/constants';

// Pipeline visual completo — ordem do fluxo conforme caderno
const PIPELINE = [
  'aguardando',
  'notificado',
  'retorno_auto',
  'ag_consolidacao',
  'em_transito',
  'recebida_filial',
  'agend_solicitado',
  'agend_confirmado',
  'entregue',
];

const TERMINAL_NEG = ['ret_nao_auto', 'extravio', 'encaminhar', 'dev_recusada', 'dev_apos_dt', 'perdeu_agenda'];

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Labels curtos para caber no stepper
const SHORT = {
  aguardando:      'Pendente',
  notificado:      'Em análise',
  retorno_auto:    'Ret. aprovado',
  ag_consolidacao: 'Consolidação',
  em_transito:     'Em trânsito',
  recebida_filial: 'Na filial',
  agend_solicitado:'Ag. solicitado',
  agend_confirmado:'Ag. confirmado',
  entregue:        'Entregue',
};

function stepIndex(v) {
  const i = PIPELINE.indexOf(v);
  // legados: mapear para posição equivalente
  if (v === 'agendado')     return PIPELINE.indexOf('agend_confirmado');
  if (v === 'perdeu_agenda') return PIPELINE.indexOf('agend_solicitado');
  return i === -1 ? -1 : i;
}

export default function TrackingStepper({ current }) {
  const isTerminal = TERMINAL_NEG.includes(current);
  const currentIdx = stepIndex(current);
  const tkObj = TK.find(t => t.v === current);

  if (isTerminal) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)',
        borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--red)', fontWeight: 600
      }}>
        {tkObj?.i} {tkObj?.l || current}
        {current === 'extravio' && (
          <span style={{ marginLeft: 4, opacity: 0.7, fontWeight: 400 }}>· pode gerar cobrança</span>
        )}
      </div>
    );
  }

  return (
    <div className="stepper">
      {PIPELINE.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const cls = `step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`;
        return (
          <div key={step} className={cls}>
            <div className="step-dot">
              {isDone ? <CheckIcon /> : <span>{idx + 1}</span>}
            </div>
            <div className="step-label">{SHORT[step] || step}</div>
          </div>
        );
      })}
    </div>
  );
}
