import { useState, useMemo } from 'react';
import { fmt } from '../utils/helpers';

export default function Transportadores({ summary = [], getEmails, setEmails, onOpenFiltered, transportadores = [], saveTransportador }) {
  const [editingTr, setEditingTr] = useState(null);
  const [fields, setFields] = useState({ emails: '', telefone: '', contato: '', obs: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const openEdit = (name) => {
    const tr = transportadores.find(t => t.nome === name) || {};
    setFields({
      emails:   tr.emails   || getEmails?.(name) || '',
      telefone: tr.telefone || '',
      contato:  tr.contato  || '',
      obs:      tr.obs      || '',
    });
    setEditingTr(name);
  };

  const handleSave = async () => {
    if (!editingTr) return;
    setSaving(true);
    try {
      if (saveTransportador) {
        await saveTransportador(editingTr, fields);
      } else {
        await setEmails?.(editingTr, fields.emails);
      }
    } finally {
      setSaving(false);
      setEditingTr(null);
    }
  };

  const filtered = useMemo(() =>
    summary.filter(tr => !search || tr.name.toLowerCase().includes(search.toLowerCase())),
    [summary, search]
  );

  const totalCobr = summary.reduce((s, t) => s + t.cobr, 0);
  const totalPend = summary.reduce((s, t) => s + t.pend, 0);
  const semEmail  = summary.filter(t => !(getEmails?.(t.name) || '')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { l: 'Transportadoras', v: summary.length, c: 'var(--gold)' },
          { l: 'Total cobranças', v: totalCobr, c: 'var(--gold)' },
          { l: 'Total devoluções', v: totalPend, c: 'var(--blue)' },
          { l: 'Sem e-mail', v: semEmail, c: semEmail > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(d => (
          <div key={d.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 4 }}>{d.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: d.c }}>{d.v}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar transportador..." className="input" style={{ maxWidth: 340 }} />

      {/* Grid de cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
        {filtered.map(tr => {
          const emails = getEmails?.(tr.name) || '';
          const trData = transportadores.find(t => t.nome === tr.name) || {};
          const hasEmail = !!emails;
          return (
            <div key={tr.name} style={{
              background: 'var(--surface)', border: `1px solid ${hasEmail ? 'var(--border)' : 'rgba(248,81,73,0.2)'}`,
              borderRadius: 12, padding: '16px 18px', transition: 'border-color 160ms'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', marginTop: 2 }}>{fmt(tr.value)}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tr.count}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' }}>notas</div>
                </div>
              </div>

              {/* Botões cobr / dev */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {tr.cobr > 0 && (
                  <button onClick={() => onOpenFiltered?.(tr.name, 'cobr')}
                    style={{ flex: 1, padding: '5px', borderRadius: 6, background: 'var(--gold-dim)', border: '1px solid rgba(166,139,92,0.2)', fontSize: 11, color: 'var(--gold)', fontWeight: 600, cursor: 'pointer' }}>
                    {tr.cobr} cobr.
                  </button>
                )}
                {tr.pend > 0 && (
                  <button onClick={() => onOpenFiltered?.(tr.name, 'pend')}
                    style={{ flex: 1, padding: '5px', borderRadius: 6, background: 'var(--blue-dim)', border: '1px solid rgba(88,166,255,0.2)', fontSize: 11, color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}>
                    {tr.pend} dev.
                  </button>
                )}
              </div>

              {/* Email + dados extras */}
              <div style={{ fontSize: 11, color: hasEmail ? 'var(--green)' : 'var(--red)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hasEmail ? `✉ ${emails.split(';')[0].trim()}${emails.includes(';') ? ' +' + (emails.split(';').length - 1) : ''}` : '✉ Sem e-mail cadastrado'}
              </div>
              {trData.telefone && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>📞 {trData.telefone}</div>}
              {trData.contato  && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>👤 {trData.contato}</div>}

              <button onClick={() => openEdit(tr.name)} className="btn btn-outline btn-xs" style={{ marginTop: 6, width: '100%' }}>
                ✏️ Editar dados
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de edição */}
      {editingTr && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingTr(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Dados do transportador</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{editingTr}</p>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label className="input-label">E-mails <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(separe com ;)</span></label>
                <input value={fields.emails} onChange={e => setFields(f => ({ ...f, emails: e.target.value }))}
                  placeholder="email1@transp.com; email2@transp.com" className="input" />
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                  Estes e-mails serão preenchidos automaticamente ao enviar por uma nota deste transportador
                </div>
              </div>

              <div>
                <label className="input-label">Telefone</label>
                <input value={fields.telefone} onChange={e => setFields(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999" className="input" />
              </div>

              <div>
                <label className="input-label">Contato / responsável</label>
                <input value={fields.contato} onChange={e => setFields(f => ({ ...f, contato: e.target.value }))}
                  placeholder="Nome do contato" className="input" />
              </div>

              <div>
                <label className="input-label">Observações</label>
                <textarea value={fields.obs} onChange={e => setFields(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Informações adicionais..." className="input" rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingTr(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-gold">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
