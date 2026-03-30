import { useState } from 'react';
import { fmt } from '../utils/helpers';

export default function Transportadores({ summary = [], getEmails, setEmails, onOpenFiltered }) {
  const [editingTr, setEditingTr] = useState(null);
  const [editEmail, setEditEmail] = useState('');

  const openEdit = (name) => {
    setEditingTr(name);
    setEditEmail(getEmails?.(name) || '');
  };

  const saveEmail = async () => {
    if (editingTr) {
      await setEmails?.(editingTr, editEmail);
      setEditingTr(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {summary.map(tr => {
          const emails = getEmails?.(tr.name) || '';
          return (
            <div key={tr.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', transition: 'border-color 160ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>{fmt(tr.value)}</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tr.count}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase' }}>notas</div>
                </div>
              </div>

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

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: emails ? 'var(--green)' : 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {emails ? `✉ ${emails.split(';')[0]}...` : '✉ Sem email'}
                </span>
                <button onClick={() => openEdit(tr.name)} className="btn btn-outline btn-xs">
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit email modal */}
      {editingTr && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingTr(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Emails do transportador</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{editingTr}</p>
            </div>
            <div className="modal-body">
              <label className="input-label">Emails (separe com ;)</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                placeholder="email1@transp.com; email2@transp.com" className="input" />
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingTr(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={saveEmail} className="btn btn-gold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
