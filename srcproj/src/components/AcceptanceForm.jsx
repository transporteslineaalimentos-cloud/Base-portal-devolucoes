import { useState } from 'react';

// AcceptanceForm — sempre um modal real, nunca inline
// Props:
//   open      boolean  — controla visibilidade
//   onClose   fn       — fecha sem salvar
//   onSave    fn(data) — salva e fecha
//   existing  object   — dados já salvos (para exibição readonly)
//   readOnly  boolean  — só visualização (quando já existe aceite)

export default function AcceptanceForm({ open, onClose, onSave, existing, readOnly = false }) {
  const [name, setName]       = useState(existing?.name  || '');
  const [cargo, setCargo]     = useState(existing?.cargo || '');
  const [email, setEmail]     = useState(existing?.email || '');
  const [checked, setChecked] = useState(!!existing?.accepted);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || !cargo.trim() || !email.trim() || !checked) {
      alert('Preencha nome, cargo, email e marque o aceite.');
      return;
    }
    setLoading(true);
    let ip = '';
    try {
      const res  = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch {}
    await onSave({ name, cargo, email, accepted: true, ip, userAgent: navigator.userAgent, ts: new Date().toISOString() });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {readOnly ? '✅ Aceite formalizado' : 'Aceite formal do transportador'}
          </span>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {readOnly ? 'Aceite já registrado. Dados abaixo para referência.' : 'Os dados de aceite ficarão gravados permanentemente na nota.'}
          </p>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">Nome completo</label>
            <input
              value={name}
              onChange={e => !readOnly && setName(e.target.value)}
              placeholder="Nome completo do responsável"
              className="input"
              readOnly={readOnly}
              style={readOnly ? { background: 'var(--surface-2)', cursor: 'default' } : {}}
            />
          </div>
          <div>
            <label className="input-label">Cargo</label>
            <input
              value={cargo}
              onChange={e => !readOnly && setCargo(e.target.value)}
              placeholder="Cargo"
              className="input"
              readOnly={readOnly}
              style={readOnly ? { background: 'var(--surface-2)', cursor: 'default' } : {}}
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => !readOnly && setEmail(e.target.value)}
              placeholder="email@transportadora.com"
              className="input"
              readOnly={readOnly}
              style={readOnly ? { background: 'var(--surface-2)', cursor: 'default' } : {}}
            />
          </div>

          {readOnly && existing?.ts && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8 }}>
              Registrado em {new Date(existing.ts).toLocaleString('pt-BR')}
              {existing.ip ? ` · IP ${existing.ip}` : ''}
            </div>
          )}

          {!readOnly && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--gold)', width: 15, height: 15, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Declaro que li as informações e formalizo o aceite desta cobrança.
              </span>
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>
            {readOnly ? 'Fechar' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button onClick={handleSave} className="btn btn-gold" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar aceite'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
