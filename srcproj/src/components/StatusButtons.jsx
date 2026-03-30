import { SO, TK, TK_INTERNAL, TK_TRANSPORT } from '../config/constants';

export default function StatusButtons({ mode, isTransporter, onStatus, onTracking, currentValue, canTransporterAct = true }) {
  if (mode === 'cobr') {
    if (isTransporter) {
      if (!canTransporterAct) {
        return (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
            Aguardando ação interna
          </span>
        );
      }
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button onClick={() => onStatus('tr_concordou', 'Aprovar cobrança', false)} className="btn btn-outline btn-sm"
            style={{ borderColor: 'rgba(63,185,80,0.4)', color: 'var(--green)' }}>
            Aprovar cobrança
          </button>
          <button onClick={() => onStatus('tr_contestou', 'Contestar cobrança', false)} className="btn btn-outline btn-sm"
            style={{ borderColor: 'rgba(248,81,73,0.4)', color: 'var(--red)' }}>
            Contestar
          </button>
          <button onClick={() => onStatus('tr_nao_resp', 'Não responsável', false)} className="btn btn-outline btn-sm">
            Não responsável
          </button>
        </div>
      );
    }

    const filtered = SO.filter(s => !['tr_concordou', 'tr_contestou', 'tr_nao_resp'].includes(s.v));
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filtered.map(s => {
          const isCurrent = s.v === currentValue;
          const isSuggested = s.v === 'emitida' || s.v === 'validado';
          return (
            <button
              key={s.v}
              onClick={() => onStatus(s.v, s.l, s.v === 'emitida')}
              disabled={isCurrent}
              className={`btn btn-sm ${isCurrent ? 'btn-ghost' : isSuggested ? 'btn-suggested' : 'btn-outline'}`}
              style={isCurrent ? { opacity: 0.4, cursor: 'default' } : {}}
            >
              {isCurrent ? '● ' : ''}{s.l}
            </button>
          );
        })}
      </div>
    );
  }

  // Tracking mode
  if (isTransporter) {
    if (!canTransporterAct) {
      return (
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
          Aguardando ação interna
        </span>
      );
    }
    const list = TK.filter(t => TK_TRANSPORT.includes(t.v));
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map(t => (
          <button key={t.v} onClick={() => onTracking(t.v, t.l, !!t.hasDate)}
            className={`btn btn-sm ${t.v === currentValue ? 'btn-ghost' : 'btn-outline'}`}
            style={t.v === currentValue ? { opacity: 0.4 } : {}}>
            {t.i} {t.l}
          </button>
        ))}
      </div>
    );
  }

  const list = TK.filter(t => TK_INTERNAL.includes(t.v));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {list.map(t => {
        const isCurrent = t.v === currentValue;
        const isSuggested = t.v === 'retorno_auto' || t.v === 'encaminhar';
        return (
          <button
            key={t.v}
            onClick={() => onTracking(t.v, t.l, !!t.hasDate)}
            disabled={isCurrent}
            className={`btn btn-sm ${isCurrent ? 'btn-ghost' : isSuggested ? 'btn-suggested' : 'btn-outline'}`}
            style={isCurrent ? { opacity: 0.4, cursor: 'default' } : {}}
          >
            {t.i} {t.l}
          </button>
        );
      })}
    </div>
  );
}
