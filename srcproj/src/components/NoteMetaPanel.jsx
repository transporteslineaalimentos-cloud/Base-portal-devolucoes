import { useMemo } from 'react';

export default function NoteMetaPanel({ noteKey, meta = {}, onSave, users = [], processInfo = null }) {
  const slaPercent = useMemo(() => {
    if (!meta.sla_inicio || !meta.sla_limite) return 0;
    const start = new Date(meta.sla_inicio).getTime();
    const end = new Date(meta.sla_limite).getTime();
    const now = Date.now();
    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }, [meta]);

  const patch = (field, value) => onSave(noteKey, { ...meta, [field]: value });

  const priorityColor = meta.prioridade === 'alta' ? 'var(--red)' : meta.prioridade === 'media' ? 'var(--yellow)' : 'var(--green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {processInfo && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Estado atual do processo</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
            <strong style={{ color: 'var(--gold)' }}>Pendência:</strong> {processInfo.pendingWith}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
            <strong style={{ color: 'var(--text)' }}>Próxima ação:</strong> {processInfo.nextAction}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Encerramento: {processInfo.closeRule}
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="input-label">Prioridade</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['baixa', 'media', 'alta'].map(p => (
            <button
              key={p}
              onClick={() => patch('prioridade', p)}
              className="btn btn-sm"
              style={{
                flex: 1, justifyContent: 'center',
                background: meta.prioridade === p ? (p === 'alta' ? 'var(--red-dim)' : p === 'media' ? 'var(--yellow-dim)' : 'var(--green-dim)') : 'transparent',
                borderColor: meta.prioridade === p ? (p === 'alta' ? 'rgba(248,81,73,0.4)' : p === 'media' ? 'rgba(210,153,34,0.4)' : 'rgba(63,185,80,0.4)') : 'var(--border)',
                color: meta.prioridade === p ? (p === 'alta' ? 'var(--red)' : p === 'media' ? 'var(--yellow)' : 'var(--green)') : 'var(--text-2)',
                fontWeight: meta.prioridade === p ? 700 : 400,
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Responsavel */}
      <div>
        <label className="input-label">Responsável</label>
        <input
          list={`resp-${noteKey}`}
          value={meta.responsavel || ''}
          onChange={e => patch('responsavel', e.target.value)}
          placeholder="Nome ou email do responsável"
          className="input"
        />
        <datalist id={`resp-${noteKey}`}>
          {users.map(u => <option key={u} value={u} />)}
        </datalist>
      </div>

      {/* Proxima acao */}
      <div>
        <label className="input-label">Próxima ação (manual)</label>
        <input
          value={meta.proxima_acao || ''}
          onChange={e => patch('proxima_acao', e.target.value)}
          placeholder="Descreva a próxima ação esperada"
          className="input"
        />
      </div>

      {/* Motivo bloqueio */}
      <div>
        <label className="input-label">Motivo de bloqueio</label>
        <input
          value={meta.motivo_bloqueio || ''}
          onChange={e => patch('motivo_bloqueio', e.target.value)}
          placeholder="Por que está bloqueada?"
          className="input"
        />
      </div>

      {/* Flags */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { field: 'cobrar_transportador', label: 'Cobrar transportador' },
          { field: 'retorno_autorizado', label: 'Retorno autorizado' },
          { field: 'aguardando_documento', label: 'Aguardando documento' },
        ].map(({ field, label }) => (
          <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => patch(field, !meta[field])}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: meta[field] ? 'var(--gold)' : 'var(--border-2)',
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transition: 'background 200ms',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: meta[field] ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            </div>
            <span style={{ fontSize: 13, color: meta[field] ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
          </label>
        ))}
      </div>

      {/* SLA */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>SLA Progress</span>
          <span style={{ fontSize: 11, color: slaPercent > 85 ? 'var(--red)' : slaPercent > 60 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700 }}>
            {Math.round(slaPercent)}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: slaPercent < 60 ? 'var(--green)' : slaPercent < 85 ? 'var(--yellow)' : 'var(--red)',
            width: `${slaPercent}%`,
            transition: 'width 500ms ease',
          }} />
        </div>
      </div>
    </div>
  );
}
