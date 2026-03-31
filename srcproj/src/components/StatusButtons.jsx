import { SO, TK, getNextStatuses } from '../config/constants';

// ─────────────────────────────────────────────────────────────────
// StatusButtons — mostra APENAS os próximos status válidos
// para o perfil + status atual da nota (conforme fluxo do caderno)
// ─────────────────────────────────────────────────────────────────
export default function StatusButtons({ mode, isTransporter, onStatus, onTracking, currentValue, canTransporterAct = true }) {
  if (mode === 'cobr') {
    const options = getNextStatuses('cobr', currentValue, isTransporter);

    if (options.length === 0) {
      const curr = SO.find(s => s.v === currentValue);
      if (curr?.final) {
        return (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
            ● Status finalizado
          </span>
        );
      }
      return (
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
          Aguardando ação {isTransporter ? 'interna' : 'do transportador'}
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(s => {
          const isPositive = ['cobr_tr', 'tr_concordou', 'aprovar_ret', 'emitida'].includes(s.v);
          const isNegative = ['cancelada', 'tr_contestou', 'tr_nao_resp'].includes(s.v);
          const isSuggested = isPositive;
          return (
            <button
              key={s.v}
              onClick={() => onStatus(s.v, s.l, s.v === 'emitida' || !!s.requires_nfd)}
              className={`btn btn-sm ${isSuggested ? 'btn-suggested' : 'btn-outline'}`}
              style={{
                borderColor: isNegative ? 'rgba(220,38,38,0.4)' : undefined,
                color: isNegative ? '#dc2626' : undefined,
              }}
            >
              {s.l}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Tracking TK ──────────────────────────────────────────────
  const options = getNextStatuses('tk', currentValue, isTransporter);

  if (options.length === 0) {
    const curr = TK.find(t => t.v === currentValue);
    if (curr?.final) {
      return (
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
          ● Status finalizado
        </span>
      );
    }
    return (
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
        Aguardando ação {isTransporter ? 'interna' : 'do transportador'}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(t => {
        const isPositive = ['retorno_auto', 'entregue', 'agendado'].includes(t.v);
        const isNegative = ['ret_nao_auto', 'extravio', 'perdeu_agenda', 'dev_recusada'].includes(t.v);
        const isSuggested = isPositive;
        return (
          <button
            key={t.v}
            onClick={() => onTracking(t.v, t.l, !!t.hasDate)}
            className={`btn btn-sm ${isSuggested ? 'btn-suggested' : 'btn-outline'}`}
            style={{
              borderColor: isNegative ? 'rgba(220,38,38,0.4)' : undefined,
              color: isNegative ? '#dc2626' : undefined,
            }}
          >
            {t.i} {t.l}
          </button>
        );
      })}
    </div>
  );
}
