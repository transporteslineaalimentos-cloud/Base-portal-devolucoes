import { useState, useMemo } from 'react';
import { fmt } from '../utils/helpers';

export default function Transportadores({ summary = [], getEmails, setEmails, onOpenFiltered, transportadores = [], saveTransportador }) {
  const [editingTr, setEditingTr] = useState(null);
  const [fields, setFields] = useState({ emails: '', telefone: '', contato: '', obs: '', aliases: [] });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [newAlias, setNewAlias] = useState('');

  const openEdit = (name) => {
    const tr = transportadores.find(t => t.nome === name) || {};
    setFields({
      emails:   tr.emails   || getEmails?.(name) || '',
      telefone: tr.telefone || '',
      contato:  tr.contato  || '',
      obs:      tr.obs      || '',
      aliases:  Array.isArray(tr.aliases) ? tr.aliases : [],
    });
    setNewAlias('');
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

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed || fields.aliases.includes(trimmed)) return;
    setFields(f => ({ ...f, aliases: [...f.aliases, trimmed] }));
    setNewAlias('');
  };

  const removeAlias = (alias) => {
    setFields(f => ({ ...f, aliases: f.aliases.filter(a => a !== alias) }));
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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { l: 'Transportadoras', v: summary.length,    c: 'var(--gold)' },
          { l: 'Total cobranças', v: totalCobr,          c: 'var(--gold)' },
          { l: 'Total devoluções',v: totalPend,          c: 'var(--blue)' },
          { l: 'Sem e-mail',      v: semEmail, c: semEmail > 0 ? 'var(--red)' : 'var(--green)' },
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
          const emails  = getEmails?.(tr.name) || '';
          const trData  = transportadores.find(t => t.nome === tr.name) || {};
          const aliases = Array.isArray(trData.aliases) ? trData.aliases : [];
          const hasEmail = !!emails;

          return (
            <div key={tr.name} style={{
              background: 'var(--surface)',
              border: `1px solid ${hasEmail ? 'var(--border)' : 'rgba(248,81,73,0.2)'}`,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tr.name}
                  </div>
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

              {/* Email */}
              <div style={{ fontSize: 11, color: hasEmail ? 'var(--green)' : 'var(--red)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hasEmail
                  ? `✉ ${emails.split(';')[0].trim()}${emails.includes(';') ? ' +' + (emails.split(';').length - 1) : ''}`
                  : '✉ Sem e-mail cadastrado'}
              </div>
              {trData.telefone && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>📞 {trData.telefone}</div>}
              {trData.contato  && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>👤 {trData.contato}</div>}

              {/* Aliases */}
              {aliases.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Nomes alternativos ({aliases.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {aliases.slice(0, 3).map(a => (
                      <span key={a} style={{ fontSize: 10, background: 'var(--purple-dim)', color: 'var(--purple)', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>
                        {a}
                      </span>
                    ))}
                    {aliases.length > 3 && (
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{aliases.length - 3}</span>
                    )}
                  </div>
                </div>
              )}

              {aliases.length === 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Nenhum nome alternativo cadastrado
                </div>
              )}

              <button onClick={() => openEdit(tr.name)} className="btn btn-outline btn-xs" style={{ marginTop: 8, width: '100%' }}>
                ✏️ Editar dados e nomes alternativos
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de edição */}
      {editingTr && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingTr(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Dados do transportador</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{editingTr}</p>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>

              {/* E-mails */}
              <div>
                <label className="input-label">E-mails <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(separe com ;)</span></label>
                <input value={fields.emails} onChange={e => setFields(f => ({ ...f, emails: e.target.value }))}
                  placeholder="email1@transp.com; email2@transp.com" className="input" />
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                  Preenchidos automaticamente ao enviar notificação por email
                </div>
              </div>

              {/* Telefone e Contato */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
              </div>

              {/* ── Nomes alternativos ────────────────────────────── */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    🏷️ Nomes alternativos (aliases)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    Cadastre aqui <strong>todas as variações de nome</strong> que esta transportadora pode aparecer nas notas fiscais — filiais com CNPJ diferente, abreviações, nomes com/sem "LTDA", etc. O usuário transportador verá notas de <strong>qualquer</strong> um desses nomes.
                  </div>
                </div>

                {/* Lista de aliases existentes */}
                {fields.aliases.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {fields.aliases.map((alias, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px',
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600, flex: 1 }}>
                          {alias}
                        </span>
                        <button
                          onClick={() => removeAlias(alias)}
                          style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', opacity: 0.7, flexShrink: 0 }}
                          title="Remover"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 12, padding: '8px 0' }}>
                    Nenhum nome alternativo cadastrado ainda.
                  </div>
                )}

                {/* Campo para adicionar novo alias */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={newAlias}
                    onChange={e => setNewAlias(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                    placeholder="Ex: REC, REC TRANSPORTES, 12.345.678 REC LTDA..."
                    className="input"
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button
                    onClick={addAlias}
                    disabled={!newAlias.trim()}
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Dica */}
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(88,166,255,.06)', border: '1px solid rgba(88,166,255,.15)', borderRadius: 7 }}>
                  <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, marginBottom: 3 }}>💡 Dica</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    Digite o nome exatamente como aparece nas notas (maiúsculas/minúsculas não importam).
                    Para descobrir as variações, vá em <strong>Cobranças</strong> ou <strong>Devoluções</strong> e filtre pelo transportador — os nomes que aparecem nas notas são os que precisam estar cadastrados.
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="input-label">Observações</label>
                <textarea value={fields.obs} onChange={e => setFields(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Informações adicionais..." className="input" rows={2} style={{ resize: 'vertical' }} />
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
