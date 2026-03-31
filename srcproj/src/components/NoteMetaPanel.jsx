import { useState } from 'react';

export default function NoteMetaPanel({ noteKey, meta = {}, onSave, users = [], processInfo = {} }) {
  const [proxAcao, setProxAcao] = useState(meta.proxima_acao || '');
  const [motivo, setMotivo] = useState(meta.motivo_bloqueio || '');
  const [saving, setSaving] = useState(false);

  const patch = async (field, value) => {
    setSaving(true);
    try {
      await onSave(noteKey, { ...meta, [field]: value });
    } finally {
      setSaving(false);
    }
  };

  const saveText = async (field, value) => {
    if (value === (meta[field] || '')) return; // sem mudança
    await patch(field, value);
  };

  const toggle = (field) => patch(field, !meta[field]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Prioridade */}
      <div>
        <label className="input-label">Prioridade</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['baixa', 'media', 'alta'].map(p => {
            const colors = {
              baixa: { active: 'var(--green-dim)', border: 'rgba(63,185,80,0.4)', text: 'var(--green)' },
              media: { active: 'var(--yellow-dim)', border: 'rgba(210,153,34,0.4)', text: 'var(--yellow)' },
              alta:  { active: 'var(--red-dim)',    border: 'rgba(248,81,73,0.4)',  text: 'var(--red)' },
            }[p];
            const isActive = meta.prioridade === p;
            return (
              <button
                key={p}
                onClick={() => patch('prioridade', p)}
                disabled={saving}
                className="btn btn-sm"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background:   isActive ? colors.active  : 'transparent',
                  borderColor:  isActive ? colors.border  : 'var(--border)',
                  color:        isActive ? colors.text     : 'var(--text-2)',
                  fontWeight:   isActive ? 700 : 400,
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsável */}
      <div>
        <label className="input-label">Responsável atual</label>
        {users.length > 0 ? (
          <select
            value={meta.responsavel || ''}
            onChange={e => patch('responsavel', e.target.value)}
            className="input"
          >
            <option value="">— Sem responsável —</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        ) : (
          <input
            defaultValue={meta.responsavel || ''}
            onBlur={e => saveText('responsavel', e.target.value)}
            placeholder="Nome ou email do responsável"
            className="input"
          />
        )}
      </div>

      {/* Próxima ação */}
      <div>
        <label className="input-label">Próxima ação</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={proxAcao}
            onChange={e => setProxAcao(e.target.value)}
            onBlur={() => saveText('proxima_acao', proxAcao)}
            placeholder={processInfo.nextAction || 'Descreva a próxima ação...'}
            className="input"
            style={{ flex: 1 }}
          />
        </div>
        {processInfo.nextAction && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
            Sugestão: {processInfo.nextAction}
          </div>
        )}
      </div>

      {/* Motivo bloqueio */}
      <div>
        <label className="input-label">Motivo do bloqueio / observação interna</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          onBlur={() => saveText('motivo_bloqueio', motivo)}
          placeholder="Registre motivo de bloqueio ou obs. interna..."
          className="input"
          rows={2}
        />
      </div>

      {/* Flags booleanas */}
      <div>
        <label className="input-label">Flags operacionais</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { field: 'cobrar_transportador',  label: 'Cobrar transportador',      color: 'var(--gold)' },
            { field: 'retorno_autorizado',     label: 'Retorno autorizado',        color: 'var(--green)' },
            { field: 'aguardando_documento',   label: 'Aguardando documento',      color: 'var(--yellow)' },
          ].map(({ field, label, color }) => {
            const active = !!meta[field];
            return (
              <button
                key={field}
                onClick={() => toggle(field)}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'var(--surface-2)',
                  border: `1px solid ${active ? color + '60' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 140ms',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${active ? color : 'var(--border-2)'}`,
                  background: active ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0E14" strokeWidth="3.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                <span style={{ fontSize: 12, color: active ? color : 'var(--text-2)', fontWeight: active ? 600 : 400 }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {saving && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
          Salvando...
        </div>
      )}
    </div>
  );
}
