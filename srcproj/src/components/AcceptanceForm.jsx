import { useState } from 'react';

export default function AcceptanceForm({ onSave, onRefuse, existing, inline = false }) {
  const [name, setName]       = useState(existing?.name  || '');
  const [cargo, setCargo]     = useState(existing?.cargo || '');
  const [email, setEmail]     = useState(existing?.email || '');
  const [checked, setChecked] = useState(!!existing?.accepted);
  const [loading, setLoading] = useState(false);
  const [refuseMode, setRefuseMode] = useState(false);
  const [refuseObs, setRefuseObs]   = useState('');

  // Already accepted — show summary
  if (existing?.accepted) {
    return (
      <div style={{ padding: 14, background: 'var(--green-dim)', border: '1px solid rgba(63,185,80,0.25)', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>Aceite registrado</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
          <strong>Responsável:</strong> {existing.name} ({existing.cargo})<br/>
          <strong>Email:</strong> {existing.email}<br/>
          <strong>Data:</strong> {existing.ts ? new Date(existing.ts).toLocaleString('pt-BR') : '—'}<br/>
          {existing.ip && <><strong>IP:</strong> {existing.ip}<br/></>}
        </div>
      </div>
    );
  }

  // Already refused — show summary
  if (existing?.refused) {
    return (
      <div style={{ padding: 14, background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Aceite recusado</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
          <strong>Motivo:</strong> {existing.refuseObs || '—'}<br/>
          <strong>Data:</strong> {existing.ts ? new Date(existing.ts).toLocaleString('pt-BR') : '—'}
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name || !cargo || !email) {
      alert('Preencha nome, cargo e email.');
      return;
    }
    if (!checked) {
      alert('Marque a caixa de concordância para prosseguir.');
      return;
    }
    setLoading(true);
    let ip = '';
    try {
      const res  = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch {}
    await onSave?.({ name, cargo, email, accepted: true, refused: false, ip, userAgent: navigator.userAgent, ts: new Date().toISOString() });
    setLoading(false);
  };

  const handleRefuse = async () => {
    if (!refuseObs.trim()) {
      alert('Informe o motivo da recusa.');
      return;
    }
    setLoading(true);
    let ip = '';
    try {
      const res  = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch {}
    await (onRefuse || onSave)?.({ accepted: false, refused: true, refuseObs: refuseObs.trim(), ip, userAgent: navigator.userAgent, ts: new Date().toISOString() });
    setLoading(false);
  };

  // Refuse mode — show only refuse form
  if (refuseMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
          Recusar aceite
        </div>
        <div>
          <label className="input-label">Motivo da recusa *</label>
          <textarea
            value={refuseObs}
            onChange={e => setRefuseObs(e.target.value)}
            placeholder="Descreva o motivo da recusa..."
            className="input"
            rows={3}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setRefuseMode(false)} className="btn btn-outline btn-sm" disabled={loading}>Voltar</button>
          <button onClick={handleRefuse} className="btn btn-danger btn-sm" disabled={loading}>
            {loading ? 'Enviando...' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    );
  }

  // Normal mode — accept form
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 14px', background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.2)', borderRadius: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 2 }}>Aceite formal</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Preencha os dados para formalizar o aceite ou recuse com justificativa.</div>
      </div>

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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setRefuseMode(true)} className="btn btn-danger btn-sm" disabled={loading}>
          Recusar aceite
        </button>
        <button onClick={handleSave} className="btn btn-gold btn-sm" disabled={loading}>
          {loading ? 'Salvando...' : 'Confirmar aceite'}
        </button>
      </div>
    </div>
  );
}
