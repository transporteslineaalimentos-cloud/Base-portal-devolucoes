import { useState } from 'react';

export default function AcceptanceForm({ open, onClose, onSave, existing }) {
  const [name, setName]       = useState(existing?.name  || '');
  const [cargo, setCargo]     = useState(existing?.cargo || '');
  const [email, setEmail]     = useState(existing?.email || '');
  const [checked, setChecked] = useState(!!existing?.accepted);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name || !cargo || !email || !checked) {
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
    onSave({ name, cargo, email, accepted: checked, ip, userAgent: navigator.userAgent, ts: new Date().toISOString() });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Aceite formal do transportador</span>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Os dados de aceite ficarão gravados na nota.</p>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">Nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo do responsável"
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Cargo</label>
            <input
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Cargo"
              className="input"
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@transportadora.com"
              className="input"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--gold)', width: 15, height: 15, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Declaro que li as informações e formalizo o aceite desta cobrança/retorno.
            </span>
          </label>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>Cancelar</button>
          <button onClick={handleSave} className="btn btn-gold" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar aceite'}
          </button>
        </div>
      </div>
    </div>
  );
}
